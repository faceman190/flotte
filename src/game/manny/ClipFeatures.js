// ClipFeatures – analyses every clip once at load time ("motion matching light").
// Evaluates only the bones that matter (root + both leg chains) directly from the tracks, at 30 Hz:
//   root position / yaw (= root motion), planar root speed,
//   foot positions + velocities relative to the root (pose features),
//   foot contacts (ball bone low and nearly still in world space incl. root motion).
// All values are in model space of the character (Y up, +Z forward, meters).
import * as THREE from 'three';

export const SAMPLE_HZ = 30;
const LEG_BONES = ['foot_l', 'foot_r', 'ball_l', 'ball_r'];

const wrapRad = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class ClipFeatureExtractor {
  constructor(model) {
    this.model = model;
    model.updateMatrixWorld(true);
    const modelInv = model.matrixWorld.clone().invert();
    // chains from the model down to each needed bone
    this.chains = {};
    this.restLocal = new Map();
    for (const name of LEG_BONES.concat(['root'])) {
      const b = model.getObjectByName(name);
      if (!b) continue;
      const chain = [];
      let o = b;
      while (o && o.isBone) { chain.unshift(o); o = o.parent; }
      this.chains[name] = { chain, baseMatrix: modelInv.clone().multiply(o ? o.matrixWorld : new THREE.Matrix4()) };
      for (const c of chain) if (!this.restLocal.has(c.name)) this.restLocal.set(c.name, { p: c.position.clone(), q: c.quaternion.clone(), s: c.scale.clone() });
    }
  }

  _interps(clip) {
    const m = new Map();
    for (const t of clip.tracks) {
      const dot = t.name.lastIndexOf('.');
      const bone = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
      if (!this.restLocal.has(bone)) continue;
      if (!m.has(bone)) m.set(bone, {});
      m.get(bone)[prop] = t.createInterpolant();
    }
    return m;
  }

  /** model-space matrices of the needed bones at time t */
  _evalAt(interps, t, out) {
    const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
    const cache = new Map();
    for (const [name, { chain, baseMatrix }] of Object.entries(this.chains)) {
      let M = baseMatrix.clone();
      for (const bone of chain) {
        if (cache.has(bone.name)) { M = cache.get(bone.name).clone(); continue; }
        const rest = this.restLocal.get(bone.name), ip = interps.get(bone.name) || {};
        if (ip.position) { const r = ip.position.evaluate(t); _p.set(r[0], r[1], r[2]); } else _p.copy(rest.p);
        if (ip.quaternion) { const r = ip.quaternion.evaluate(t); _q.set(r[0], r[1], r[2], r[3]); } else _q.copy(rest.q);
        if (ip.scale) { const r = ip.scale.evaluate(t); _s.set(r[0], r[1], r[2]); } else _s.copy(rest.s);
        M.multiply(_m.compose(_p, _q, _s));
        cache.set(bone.name, M.clone());
      }
      out[name] = new THREE.Vector3().setFromMatrixPosition(M);
      if (name === 'root') out.rootQuat = new THREE.Quaternion().setFromRotationMatrix(M);
    }
    return out;
  }

  analyse(clip) {
    const ip = this._interps(clip);
    const dur = clip.duration, n = Math.max(2, Math.round(dur * SAMPLE_HZ) + 1);
    const ts = new Float32Array(n);
    const raw = [];
    for (let i = 0; i < n; i++) { ts[i] = (i / (n - 1)) * dur; raw.push(this._evalAt(ip, ts[i], {})); }
    // root yaw (unwrapped, relative to t=0; + = turn left), root position relative to t=0
    const q0inv = raw[0].rootQuat ? raw[0].rootQuat.clone().invert() : new THREE.Quaternion();
    const f = new THREE.Vector3(), dq = new THREE.Quaternion();
    const yaw = new Float32Array(n), rootPos = [];
    let acc = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      if (raw[i].rootQuat) { dq.copy(raw[i].rootQuat).multiply(q0inv); f.set(0, 0, 1).applyQuaternion(dq); }
      else f.set(0, 0, 1);
      const y = Math.atan2(f.x, f.z); acc += wrapRad(y - prev); prev = y; yaw[i] = acc;
      rootPos.push(raw[i].root ? raw[i].root.clone().sub(raw[0].root) : new THREE.Vector3());
    }
    // pose features: feet relative to root, in root-facing frame
    const rel = (i, bone) => raw[i][bone].clone().sub(raw[i].root || new THREE.Vector3()).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -yaw[i]);
    const footL = [], footR = [];
    for (let i = 0; i < n; i++) { footL.push(rel(i, 'foot_l')); footR.push(rel(i, 'foot_r')); }
    const vel = (arr, i) => { const a = arr[Math.max(0, i - 1)], b = arr[Math.min(n - 1, i + 1)]; const dt = ts[Math.min(n - 1, i + 1)] - ts[Math.max(0, i - 1)]; return b.clone().sub(a).multiplyScalar(dt > 0 ? 1 / dt : 0); };
    const velL = footL.map((_, i) => vel(footL, i)), velR = footR.map((_, i) => vel(footR, i));
    // contacts (world incl. root motion): ball low and slow
    const contact = (bone) => {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const a = raw[Math.max(0, i - 1)][bone], b = raw[Math.min(n - 1, i + 1)][bone];
        const dt = ts[Math.min(n - 1, i + 1)] - ts[Math.max(0, i - 1)];
        const sp = dt > 0 ? Math.hypot(b.x - a.x, b.z - a.z) / dt : 0;
        out[i] = raw[i][bone].y < 0.07 && sp < 0.45 ? 1 : 0;
      }
      return out;
    };
    const contactL = contact('ball_l'), contactR = contact('ball_r');
    // planar root speed (smoothed +-0.1 s)
    const speed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3);
      speed[i] = ts[b] > ts[a] ? Math.hypot(rootPos[b].x - rootPos[a].x, rootPos[b].z - rootPos[a].z) / (ts[b] - ts[a]) : 0;
    }
    // direction of travel relative to the root facing at that time, over a window
    const dirAt = (i0, i1) => {
      const d = rootPos[i1].clone().sub(rootPos[i0]).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -yaw[i0]);
      return Math.hypot(d.x, d.z) > 0.05 ? Math.atan2(-d.x, d.z) * 180 / Math.PI : null;
    };
    const k = (s) => Math.min(n - 1, Math.round(s * SAMPLE_HZ));
    let firstLift = null;
    for (let i = 1; i < n && !firstLift; i++) {
      if (contactL[i - 1] && !contactL[i]) firstLift = 'L';
      else if (contactR[i - 1] && !contactR[i]) firstLift = 'R';
    }
    const total = rootPos[n - 1];
    // cumulative planar path length of the root (distance matching: play a start / stop by distance travelled)
    const cum = new Float32Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(rootPos[i].x - rootPos[i - 1].x, rootPos[i].z - rootPos[i - 1].z);
    return {
      cum,
      /** clip time at which the root has travelled d metres (from t = 0); clamped to the clip */
      timeAtCum(d) {
        if (d <= 0) return 0;
        if (d >= cum[n - 1]) return dur;
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
        const span = cum[hi] - cum[lo];
        return ts[lo] + (span > 1e-6 ? (d - cum[lo]) / span : 0) * (ts[hi] - ts[lo]);
      },
      cumAt(t) {
        const x = Math.min(Math.max(t / dur, 0), 1) * (n - 1), i = Math.floor(x), a = x - i;
        return i >= n - 1 ? cum[n - 1] : cum[i] * (1 - a) + cum[i + 1] * a;
      },
      name: clip.name, duration: dur, n, ts, yaw, rootPos, speed, footL, footR, velL, velR, contactL, contactR,
      dist: Math.hypot(total.x, total.z),
      dirDeg: Math.hypot(total.x, total.z) > 0.05 ? Math.atan2(-total.x, total.z) * 180 / Math.PI : 0,
      startDirDeg: dirAt(0, k(0.5)),                    // initial travel direction (relative to initial facing)
      endDirDeg: n > 20 ? dirAt(Math.max(0, n - 1 - k(0.5)), n - 1) : null,   // final travel dir relative to final facing
      yawTotalDeg: yaw[n - 1] * 180 / Math.PI,
      firstLift,
      // sampled helpers
      index(t) { return Math.min(n - 1, Math.max(0, Math.round(t * SAMPLE_HZ))); },
      posAt(t) {
        const x = Math.min(Math.max(t / dur, 0), 1) * (n - 1), i = Math.floor(x), a = x - i;
        return i >= n - 1 ? rootPos[n - 1].clone() : rootPos[i].clone().lerp(rootPos[i + 1], a);
      },
      yawAt(t) {
        const x = Math.min(Math.max(t / dur, 0), 1) * (n - 1), i = Math.floor(x), a = x - i;
        return i >= n - 1 ? yaw[n - 1] : yaw[i] * (1 - a) + yaw[i + 1] * a;
      },
      takeoff: (() => { for (let i = 0; i < n; i++) if (rootPos[i].y > 0.05) return ts[i]; return 0; })(),
      landing: (() => { const yEnd = rootPos[n - 1].y; let high = false; for (let i = 0; i < n; i++) { if (rootPos[i].y - yEnd > 0.1) high = true; else if (high) return ts[i]; } return 0; })(),
    };
  }
}

/** pose-matching cost between the current pose features and clip sample i */
export function poseCost(f, i, cur, w = {}) {
  const wp = w.pos ?? 1, wv = w.vel ?? 0.02, ws = w.speed ?? 0.15;
  const dl = f.footL[i].distanceToSquared(cur.footL), dr = f.footR[i].distanceToSquared(cur.footR);
  const vl = f.velL[i].distanceToSquared(cur.velL), vr = f.velR[i].distanceToSquared(cur.velR);
  const ds = (f.speed[i] - cur.speed) ** 2;
  return wp * (dl + dr) + wv * (vl + vr) + ws * ds;
}
