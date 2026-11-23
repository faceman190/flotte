// Motion matching: a database of every frame of the locomotion clips (starts, loops, stops, pivots) and a search
// that finds the frame fitting best to (a) the pose the character has right now and (b) the way it is going to
// move in the next half second. The animator then simply plays on from that frame and asks again a moment later.
//
// One database row per clip sample (ClipFeatures, 30 Hz), all values in the character's own frame (+Z forward):
//    0.. 5  foot positions L, R            (where the feet are)
//    6..11  foot velocities L, R           (how they move)
//   12..13  root velocity x, z             (how fast and where the body travels)
//   14..19  root position x, z in 0.15 / 0.35 / 0.6 s   (the trajectory the clip is about to take)
// Every group is divided by its spread over the whole database (and the root of its size) and multiplied by its weight; the cost of a row
// is the squared distance to the query. Rows carry a kind (start / loop / stop / pivot) and a gait, the search is
// restricted to the kinds and the gait the animator asks for.
export const KIND = { start: 1, loop: 2, stop: 4, pivot: 8 };
export const GAITS = ['walk', 'run', 'sprint', 'crouch'];
export const DIM = 20;
export const TRAJ_T = [0.15, 0.35, 0.6];

const GROUPS = [[0, 6, 'footPos'], [6, 12, 'footVel'], [12, 14, 'rootVel'], [14, 16, 'traj0'], [16, 18, 'traj1'], [18, 20, 'traj2']];
// weight of each GROUP as a whole (a group with more values does not count more). Where the body goes (velocity, path) decides
// the clip and its direction; the feet decide the moment inside it.
export const MM_WEIGHTS = { footPos: 1.0, footVel: 0.5, rootVel: 1.6, traj0: 0.9, traj1: 1.2, traj2: 1.2 };

export class MotionMatcher {
  /** feat: ClipFeatures by clip name · entries: [{ name, kind: 'start'|'loop'|'stop'|'pivot', gait }] */
  /** poseDist(name, ta, tb): mean rotation difference (deg) of ALL bones of a clip between two times (optional, for the loop cycles) */
  constructor(feat, entries, weights = {}, poseDist = null) {
    this.cycleAir = weights.cycleAir ?? 0.06;   // m – a seam with a foot on the ground costs this much more than one in the flight phase
    this.poseDist = poseDist; this.cycleBody = weights.cycleBody ?? 0;   // measured: choosing the seam by the feet alone slides least (356 cm against 450 cm with 0.03)
    this.weights = Object.assign({}, MM_WEIGHTS, weights);
    this.clips = [];                    // { name, kind, gait, off, n, loop }
    this.byName = new Map();
    let rows = 0;
    for (const e of entries) {
      const f = feat[e.name]; if (!f || this.byName.has(e.name)) continue;
      const c = { name: e.name, kind: KIND[e.kind], gait: GAITS.indexOf(e.gait), off: rows, n: f.n, loop: e.kind === 'loop', f };
      this.clips.push(c); this.byName.set(e.name, c); rows += f.n;
    }
    this.rows = rows;
    this.data = new Float32Array(rows * DIM);
    this.kind = new Uint8Array(rows);     // 0 = row is not played (run-in / run-out of a start or pivot, see _fill)
    this.gait = new Uint8Array(rows);
    this.clipOf = new Uint16Array(rows);
    for (const c of this.clips) if (c.loop) this._cycle(c);
    for (let ci = 0; ci < this.clips.length; ci++) this._fill(ci);
    this._normalise();
  }

  /**
   * The loop clips of the GLB do not close: their last frame is 0.3 – 0.9 m (feet) away from their first one, so playing
   * them round gives a jerk every few seconds. Inside each clip there are clean gait cycles, though. Find the pair of
   * samples (a, b), at least 0.45 s apart, whose poses (feet and their velocities) fit best – the clip is then played
   * from a to b and round again. c.a / c.b: times, c.speed: real travel speed over that cycle.
   */
  _cycle(c) {
    const f = c.f, n = f.n, min = Math.round(0.45 * 30);
    const d = (i, j) => Math.sqrt(f.footL[i].distanceToSquared(f.footL[j]) + f.footR[i].distanceToSquared(f.footR[j])
      + 0.01 * (f.velL[i].distanceToSquared(f.velL[j]) + f.velR[i].distanceToSquared(f.velR[j])));
    let bi = 0, bj = n - 1, bs = Infinity, bc = 0;
    const air = (i) => !f.contactL[i] && !f.contactR[i] && !f.contactL[i + 1] && !f.contactR[i + 1];
    const cand = [];
    for (let i = 1; i < n - min - 1; i++) for (let j = i + min; j < n - 1; j++) {
      // a slightly longer cycle is welcome when it fits as well; a seam in the flight phase too (the rest between the two ends
      // is blended away over about 0.1 s – on a foot that has just come down that shows as sliding, in the air it does not)
      const cst = d(i, j), score = cst - 0.0012 * (j - i) + (air(i) && air(j) ? 0 : this.cycleAir);
      if (score < bs) { bs = score; bi = i; bj = j; bc = cst; }
      if (cst < 0.3) cand.push([score, i, j, cst]);
    }
    // optional (cycleBody > 0): the best candidates are also compared with the whole body, 1 deg of mean rotation counts
    // like cycleBody metres at the feet. Makes the seam of the sprint smoother (7 -> 4 deg) but the feet slide more overall.
    if (this.poseDist && cand.length && this.cycleBody > 0) {
      cand.sort((x, y) => x[0] - y[0]);
      let best = Infinity;
      for (const [score, i, j, cst] of cand.slice(0, 60)) {
        const s2 = score + this.cycleBody * this.poseDist(c.name, f.ts[i], f.ts[j]);
        if (s2 < best) { best = s2; bi = i; bj = j; bc = cst; }
      }
    }
    c.ia = bi; c.ib = bj; c.a = f.ts[bi]; c.b = f.ts[bj]; c.gap = bc;
    c.speed = (f.cum[bj] - f.cum[bi]) / (c.b - c.a);
    // where in the cycle the left foot comes down (0..1): loops of different directions are blended at the same gait phase
    c.phi0 = 0;
    for (let i = bi + 1; i < bj; i++) if (!f.contactL[i - 1] && f.contactL[i]) { c.phi0 = (f.ts[i] - c.a) / (c.b - c.a); break; }
  }

  _fill(ci) {
    const c = this.clips[ci], f = c.f, n = f.n, dur = f.duration, d = this.data;
    const cos = (a) => Math.cos(a), sin = (a) => Math.sin(a);
    // root position at any time: loops go round, other clips continue with the speed they end with (a stop: stands)
    const end = f.rootPos[n - 1], k6 = Math.max(0, n - 7), tail = f.ts[n - 1] - f.ts[k6];
    const vEx = tail > 0 ? (end.x - f.rootPos[k6].x) / tail : 0, vEz = tail > 0 ? (end.z - f.rootPos[k6].z) / tail : 0;
    const pa = c.loop ? f.posAt(c.a) : null, pb = c.loop ? f.posAt(c.b) : null;
    const posAt = (t, out) => {
      if (c.loop) {      // round the clean cycle a..b
        let ox = 0, oz = 0;
        while (t > c.b) { t -= c.b - c.a; ox += pb.x - pa.x; oz += pb.z - pa.z; }
        const p = f.posAt(t); out[0] = p.x + ox; out[1] = p.z + oz; return out;
      }
      if (t <= dur) { const p = f.posAt(t); out[0] = p.x; out[1] = p.z; return out; }
      out[0] = end.x + vEx * (t - dur); out[1] = end.z + vEz * (t - dur); return out;
    };
    // which part of the clip may be played: a start only while it accelerates, a pivot only around its turn. Their run-in / run-out
    // is plain running – that is what the loops are for (otherwise the search hops between look-alike frames of many clips)
    let from = 0, to = dur;
    if (c.loop) { from = c.a; to = c.b - 1e-4; }
    if (c.kind === KIND.start || c.kind === KIND.pivot) {
      const m = Math.round(0.3 * 30); let i0 = 0;
      if (c.kind === KIND.pivot) { i0 = m; for (let i = m; i < n - m; i++) if (f.speed[i] < f.speed[i0]) i0 = i; from = f.ts[i0] - 0.55; }
      let vmax = 0; for (let i = i0; i < n; i++) vmax = Math.max(vmax, f.speed[i]);
      let iS = n - 1; for (let i = i0; i < n; i++) if (f.speed[i] >= 0.93 * vmax) { iS = i; break; }
      to = Math.min(f.ts[iS] + 0.15, dur - 0.5);
    }
    c.from = from; c.to = to;
    const p = [0, 0];
    for (let i = 0; i < n; i++) {
      const r = (c.off + i) * DIM, y = f.yaw[i], cy = cos(-y), sy = sin(-y);
      // rotate a planar vector into the root-facing frame of sample i (rotation about Y by -yaw)
      const rx = (x, z) => x * cy + z * sy, rz = (x, z) => -x * sy + z * cy;
      const fl = f.footL[i], fr = f.footR[i], vl = f.velL[i], vr = f.velR[i];
      d[r] = fl.x; d[r + 1] = fl.y; d[r + 2] = fl.z; d[r + 3] = fr.x; d[r + 4] = fr.y; d[r + 5] = fr.z;
      d[r + 6] = vl.x; d[r + 7] = vl.y; d[r + 8] = vl.z; d[r + 9] = vr.x; d[r + 10] = vr.y; d[r + 11] = vr.z;
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dt = f.ts[b] - f.ts[a];
      const vx = dt > 0 ? (f.rootPos[b].x - f.rootPos[a].x) / dt : 0, vz = dt > 0 ? (f.rootPos[b].z - f.rootPos[a].z) / dt : 0;
      d[r + 12] = rx(vx, vz); d[r + 13] = rz(vx, vz);
      const here = f.rootPos[i];
      for (let k = 0; k < TRAJ_T.length; k++) {
        posAt(f.ts[i] + TRAJ_T[k], p);
        d[r + 14 + k * 2] = rx(p[0] - here.x, p[1] - here.z); d[r + 15 + k * 2] = rz(p[0] - here.x, p[1] - here.z);
      }
      this.kind[c.off + i] = f.ts[i] < from || f.ts[i] > to ? 0 : c.kind;
      this.gait[c.off + i] = c.gait; this.clipOf[c.off + i] = ci;
    }
  }

  _normalise() {
    const d = this.data, N = this.rows;
    this.scale = new Float32Array(DIM);
    for (const [a, b, name] of GROUPS) {
      let v = 0;
      for (let k = a; k < b; k++) {
        let m = 0; for (let i = 0; i < N; i++) m += d[i * DIM + k]; m /= N || 1;
        let s = 0; for (let i = 0; i < N; i++) { const x = d[i * DIM + k] - m; s += x * x; }
        v += s / (N || 1);
      }
      const spread = Math.sqrt(v / (b - a)) || 1;
      for (let k = a; k < b; k++) this.scale[k] = this.weights[name] / (spread * Math.sqrt(b - a));
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < DIM; k++) d[i * DIM + k] *= this.scale[k];
  }

  /** cost of one row for a raw (unscaled) query */
  _cost(q, row) {
    const d = this.data, r = row * DIM; let c = 0;
    for (let k = 0; k < DIM; k++) { const x = q[k] - d[r + k]; c += x * x; }
    return c;
  }
  _scaled(query) { const q = this._q || (this._q = new Float32Array(DIM)); for (let k = 0; k < DIM; k++) q[k] = query[k] * this.scale[k]; return q; }

  /** cost of going on with clip `name` at time t (Infinity: unknown clip or a row that must not be entered) */
  costAt(query, name, t, kinds, gait) {
    const c = this.byName.get(name); if (!c) return Infinity;
    const row = c.off + c.f.index(t);
    if (!(this.kind[row] & kinds) || this.gait[row] !== gait) return Infinity;
    return this._cost(this._scaled(query), row);
  }

  /**
   * best row for the query among the given kinds (bit mask) and gait (index into GAITS).
   * skip: { name, t, window } – rows of the running clip close to its current time are left out (staying there is `costAt`).
   */
  search(query, kinds, gait, skip = null) {
    const q = this._scaled(query), d = this.data, kind = this.kind, gt = this.gait, N = this.rows;
    let sA = -1, sB = -1;
    if (skip) {
      const c = this.byName.get(skip.name);
      // a loop is left out as a whole: its cycle is short, and jumping about inside it gains nothing
      if (c && c.loop) { sA = c.off; sB = c.off + c.n - 1; }
      else if (c) { const i = c.f.index(skip.t), w = Math.round((skip.window ?? 0.25) * 30); sA = c.off + Math.max(0, i - w); sB = c.off + Math.min(c.n - 1, i + w); }
    }
    let best = -1, bc = Infinity;
    for (let i = 0; i < N; i++) {
      if (!(kind[i] & kinds) || gt[i] !== gait || (i >= sA && i <= sB)) continue;
      const r = i * DIM; let c = 0;
      for (let k = 0; k < DIM; k++) { const x = q[k] - d[r + k]; c += x * x; if (c >= bc) break; }
      if (c < bc) { bc = c; best = i; }
    }
    if (best < 0) return null;
    const c = this.clips[this.clipOf[best]];
    return { name: c.name, t: c.f.ts[best - c.off], cost: bc, kind: c.kind, loop: c.loop, row: best };
  }
}
