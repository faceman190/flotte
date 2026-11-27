// WeaponLayer – the upper body of the player figure with a weapon in hand.
//
// The locomotion of the figure (MannyAnimator, clips of the Game Animation Sample) knows no weapons. This layer puts the weapon
// stances of Epic's Lyra Starter Game on top of it: everything from spine_01 upwards comes from the Lyra clips, the legs and the
// pelvis stay with the locomotion (in Unreal: "layered blend per bone" with a mesh space rotation blend).
//
//   base      hip (weapon ready) <-> ads (aiming), crouched its own stance · reload and equip replace the base while they play
//   carry     while moving without aiming: Lyra's jog clip (rifle across the body, about 20° down) – for jogging and sprinting alike,
//             Lyra has no sprint clips. Standing relaxed, the hip stance sinks a little (aim offset pitched down: TUNE.lowReady)
//   aim       the aim offset poses of Lyra (…_AO_LU, _CC, _RD …) as deltas on top: weapon and chest follow the view
//   additive  recoil (…_Fire against its last frame) and hit reactions (MM_HitReact_… against their first frame)
//   fit       the stances point the barrel only roughly along the view. Whoever owns the figure turns the chest afterwards until the
//             barrel points at the aim point (mannyAvatar.ts fitGun, weight fitW); with o.late the additives wait for additive(),
//             called after that – otherwise the fit would take the recoil out again
//   left hand two bone IK onto the fore grip of the weapon actually carried (the game's weapons are shorter than Lyra's rifle)
//
// The clips are not played by the THREE mixer: the layer samples the tracks itself (ClipStore._decode) and writes the bones
// directly. apply() has to run after the mixer and after Inertializer.savePure(), before Inertializer.apply() – like PoseLayers.
// The Lyra clips in the set hold the upper body only (scripts/clipset.mjs, LYRA_BONES).
//
// mount: an Object3D on the bone weapon_r in the bone's own frame (x = barrel, z = up): Lyra's weapon models hang here unchanged.
// socket: a child of mount, turned so that a weapon model with the barrel along −z and its top along +y (the game's own weapon
// models, origin at the grip) lies in the hand like Lyra's.
import * as THREE from 'three';
import { TwoBoneIK } from './FootIK.js';

const R = 'MM_Rifle_', P = 'MM_Pistol_', S = 'MM_Shotgun_';
const KINDS = {
  rifle: { hip: R + 'Idle_Hipfire', ads: R + 'Idle_ADS', crouch: R + 'Crouch_Idle', carry: R + 'Jog_Fwd', fire: R + 'Fire', reload: R + 'Reload', equip: R + 'Equip',
    ao: { hip: R + 'Idle_Hipfire_AO_', ads: R + 'Idle_ADS_AO_', crouch: R + 'Crouch_Idle_AO_' }, ik: 1 },
  pistol: { hip: P + 'Idle_Hipfire', ads: P + 'Idle_ADS', crouch: P + 'Crouch_Idle', carry: P + 'Jog_Fwd', fire: P + 'Fire', reload: P + 'Reload', equip: P + 'Equip',
    ao: { hip: P + 'Idle_ADS_AO_', ads: P + 'Idle_ADS_AO_', crouch: P + 'Idle_ADS_AO_' }, ik: 0 },      // two hands on one grip: as animated
  shotgun: { hip: S + 'Idle_Hipfire', ads: S + 'Idle_ADS', crouch: R + 'Crouch_Idle', carry: R + 'Jog_Fwd', fire: S + 'Fire', reload: S + 'Reload', equip: R + 'Equip',
    ao: { hip: R + 'Idle_Hipfire_AO_', ads: R + 'Idle_ADS_AO_', crouch: R + 'Crouch_Idle_AO_' }, ik: 1 },
};
const TOSS = 'MM_Rifle_GrenadeToss';
const HITS = ['Front_Lgt_01', 'Front_Lgt_02', 'Front_Lgt_03', 'Front_Lgt_04', 'Front_Med_01', 'Front_Med_02', 'Left_Lgt_01', 'Right_Lgt_01'].map((n) => 'MM_HitReact_' + n);
// aim offset poses: columns (view to the left … right of the body) and rows (down, level, up), in degrees
const AO_COLS = [['LB', -180], ['L', -90], ['C', 0], ['R', 90], ['RB', 180]], AO_ROWS = [['D', -90], ['C', 0], ['U', 90]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ID = new THREE.Quaternion();
const _a = new THREE.Quaternion(), _b = new THREE.Quaternion(), _c = new THREE.Quaternion(), _acc = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();

export const TUNE = {
  blend: 0.18,          // s – weapon up / away
  aimRate: 7,           // 1/s – hip <-> ads
  fireGain: 1.6,        // strength of the recoil pose (1 = as animated; Lyra's is small)
  hitGain: 1,           // strength of the hit reaction
  equipOut: 0.25,       // s – blend from the end of the equip clip into the stance
  reloadBlend: 0.14,    // s – into and out of the reload clip
  carryIn: 3.2,         // 1/s – weapon down into the carry stance once the figure moves
  carryOut: 11,         // 1/s – weapon up again (aiming, firing, stopping): fast, the shot must not wait for the arms
  carryAfterFire: 0.9,  // s – after a shot the weapon stays up this long, even while moving
  carryAim: 0.35,       // share of the aim offsets (weapon follows the view) that stays while carrying
  carryRate: [0.85, 1.3],// playback speed of the carry clip: jogging … sprinting
  carryFp: [0.5, 0.68], // first person: share of the carry stance while jogging … sprinting (fully carried, the weapon leaves the picture)
  lowReady: 0,          // deg – standing relaxed: the hip stance points this far below the view (16 until 2026-11-27; the user wants the weapon on the crosshair)
  lowReadyFp: 7,        // deg – the same in first person
  lowReadyIn: 1.6,      // 1/s – sinking into it (after lowReadyAfter s without a shot)
  lowReadyAfter: 1.4,
};

export class WeaponLayer {
  /** clips: ClipStore */
  constructor(model, clips) {
    this.model = model; this.store = clips; this.fps = clips.fps || 30;
    const bones = new Map();
    model.traverse((o) => { if (o.isBone) bones.set(o.name, o); });
    this.pelvis = bones.get('pelvis'); this.wr = bones.get('weapon_r');
    const sp = bones.get('spine_01'), rb = new Set(clips.rb || []);
    this.B = [];
    if (sp) sp.traverse((o) => { if (o.isBone && rb.has(o.name)) this.B.push(o); });      // parents first; B[0] = spine_01
    this.N = this.B.length;
    this.only = new Set([...this.B.map((b) => b.name), 'pelvis']);
    this.iW = this.B.indexOf(this.wr);
    this.ready = !!(sp && this.pelvis && this.wr && this.B[0] === sp && clips._decode && clips.has(KINDS.rifle.ads) && clips.has(KINDS.rifle.hip));
    this._data = new Map(); this._ao = new Map(); this._ref = new Map();
    this.mount = new THREE.Object3D(); this.mount.name = 'WaffeKnochen';
    this.socket = new THREE.Object3D(); this.socket.name = 'Waffe'; this.mount.add(this.socket);
    // weapon model (x right, y up, −z barrel)  →  bone weapon_r (x barrel, y left, z up)
    this.socket.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    if (this.wr) this.wr.add(this.mount);
    const ua = bones.get('upperarm_l'), la = bones.get('lowerarm_l'), hl = bones.get('hand_l');
    this.ikL = ua && la && hl ? new TwoBoneIK(ua, la, hl) : null;
    this.grip = null;                                     // fore grip in the socket's frame (set with the weapon model), null = as animated
    this.pose = this._buf(); this._tmp = this._buf(); this._tmp2 = this._buf();
    this.w = 0; this.aimW = 0; this.kind = 'rifle'; this.t = 0;
    this.fireT = 9; this.shots = -1; this.hitT = 9; this.hits = -1; this.hitClip = HITS[0];
    this.equipT = 9; this.reloadW = 0; this.reloadP = 0; this.ikW = 0; this.armed = false;
    this.tossT = 9; this.tosses = -1;
    this.carryW = 0; this.carryT = 0; this.lowW = 0;
    this.fitW = 0; this._addW = 0; this._addFire = false;
  }

  _buf() { return { q: new Float32Array(this.N * 4), pel: new Float32Array([0, 0, 0, 1]), wp: new Float32Array(3) }; }

  /** tracks of a clip for the bones of the layer: rot[i] (4 or f·4 values) per bone, pelvis, position of weapon_r */
  _clip(name) {
    let d = this._data.get(name);
    if (d !== undefined) return d;
    const c = this.store.byName.get(name);
    if (!c) { this._data.set(name, null); return null; }
    const { f, rot, tr } = this.store._decode(c, this.only);
    d = { f, dur: (f - 1) / this.fps, rot: this.B.map((b) => rot.get(b.name) || null), pel: rot.get('pelvis') || null, wp: tr.get('weapon_r') || null };
    this._data.set(name, d);
    return d;
  }

  /** pose of a clip at time t (clamped) into out; bones the clip has no track for keep what out holds */
  _sample(d, t, out) {
    const f = d.f, x = clamp(t, 0, d.dur) * this.fps, i = Math.min(f - 1, Math.floor(x)), j = Math.min(f - 1, i + 1), u = x - i, q = out.q;
    const put = (v, o, dst) => {
      if (v.length === 4) { dst[o] = v[0]; dst[o + 1] = v[1]; dst[o + 2] = v[2]; dst[o + 3] = v[3]; return; }
      const a = i * 4, b = j * 4, s = v[a] * v[b] + v[a + 1] * v[b + 1] + v[a + 2] * v[b + 2] + v[a + 3] * v[b + 3] < 0 ? -u : u, k = 1 - u;
      const X = v[a] * k + v[b] * s, Y = v[a + 1] * k + v[b + 1] * s, Z = v[a + 2] * k + v[b + 2] * s, W = v[a + 3] * k + v[b + 3] * s, n = 1 / (Math.hypot(X, Y, Z, W) || 1);
      dst[o] = X * n; dst[o + 1] = Y * n; dst[o + 2] = Z * n; dst[o + 3] = W * n;
    };
    for (let b = 0; b < this.N; b++) if (d.rot[b]) put(d.rot[b], b * 4, q);
    if (d.pel) put(d.pel, 0, out.pel);
    if (d.wp) {
      const v = d.wp;
      if (v.length === 3) { out.wp[0] = v[0]; out.wp[1] = v[1]; out.wp[2] = v[2]; }
      else for (let k = 0; k < 3; k++) out.wp[k] = v[i * 3 + k] * (1 - u) + v[j * 3 + k] * u;
    }
    return out;
  }

  /** a += (b − a) · w, bone by bone */
  _mix(a, b, w) {
    if (w <= 0.001) return a;
    const mix = (x, y, n) => {
      for (let o = 0; o < n; o += 4) {
        const s = x[o] * y[o] + x[o + 1] * y[o + 1] + x[o + 2] * y[o + 2] + x[o + 3] * y[o + 3] < 0 ? -w : w, k = 1 - w;
        const X = x[o] * k + y[o] * s, Y = x[o + 1] * k + y[o + 1] * s, Z = x[o + 2] * k + y[o + 2] * s, W = x[o + 3] * k + y[o + 3] * s, m = 1 / (Math.hypot(X, Y, Z, W) || 1);
        x[o] = X * m; x[o + 1] = Y * m; x[o + 2] = Z * m; x[o + 3] = W * m;
      }
    };
    mix(a.q, b.q, this.N * 4); mix(a.pel, b.pel, 4);
    for (let k = 0; k < 3; k++) a.wp[k] += (b.wp[k] - a.wp[k]) * w;
    return a;
  }

  _loop(name, out) { const d = this._clip(name); return d ? this._sample(d, d.dur > 0 ? this.t % d.dur : 0, out) : null; }

  /** aim offset grid of a stance: per pose the rotation that turns the centre pose into it (per bone, in the parent's frame) */
  _grid(prefix) {
    let g = this._ao.get(prefix);
    if (g !== undefined) return g;
    const cc = this._clip(prefix + 'CC');
    if (!cc) { this._ao.set(prefix, null); return null; }
    const base = this._sample(cc, 0, this._buf());
    g = AO_COLS.map(([cx]) => AO_ROWS.map(([ry]) => {
      const d = this._clip(prefix + cx + ry) || cc, p = this._sample(d, 0, this._buf()), out = new Float32Array(this.N * 4);
      for (let b = 0; b < this.N; b++) {
        _a.fromArray(p.q, b * 4).multiply(_b.fromArray(base.q, b * 4).invert());
        if (_a.w < 0) _a.set(-_a.x, -_a.y, -_a.z, -_a.w);
        _a.toArray(out, b * 4);
      }
      return out;
    }));
    this._ao.set(prefix, g);
    return g;
  }

  /** reference pose an additive clip is measured against (frame: 0 = first, −1 = last) */
  _refPose(name, frame) {
    let r = this._ref.get(name);
    if (r) return r;
    const d = this._clip(name);
    r = this._sample(d, frame < 0 ? d.dur : 0, this._buf());
    this._ref.set(name, r);
    return r;
  }

  _additive(name, t, frame, gain, fadeIn = 0) {
    const d = this._clip(name);
    if (fadeIn > 0) gain *= Math.min(1, t / fadeIn);
    if (!d || t >= d.dur || gain <= 0.001) return;
    const ref = this._refPose(name, frame), p = this._sample(d, t, this._tmp2);
    // fade in over the first frame and out over the last 0.1 s: a clip cut off early or not ending exactly on its reference does not pop
    const k = gain * Math.min(1, (d.dur - t) / 0.1);
    for (let b = 0; b < this.N; b++) {
      if (!d.rot[b] || d.rot[b].length === 4) continue;
      _a.fromArray(p.q, b * 4).multiply(_b.fromArray(ref.q, b * 4).invert());
      if (_a.w < 0) _a.set(-_a.x, -_a.y, -_a.z, -_a.w);
      if (_a.w > 0.999999) continue;
      this.B[b].quaternion.premultiply(k === 1 ? _a : _c.copy(ID).slerp(_a, Math.min(k, 2)));
    }
  }

  /** make sure the clips of a kind are decoded (a few ms); call when the weapon is taken, not in the middle of a fight */
  warm(kind) {
    const K = KINDS[kind] || KINDS.rifle;
    for (const n of [K.hip, K.ads, K.crouch, K.carry, K.fire, K.reload, K.equip, TOSS]) this._clip(n);
    for (const p of new Set(Object.values(K.ao))) this._grid(p);
  }

  /**
   * o.armed · o.kind 'rifle' | 'pistol' | 'shotgun' · o.aim (weapon up) · o.crouchW 0..1 · o.yaw / o.pitch: where the view points
   * relative to the body, deg (yaw + = right, pitch + = up) · o.shots / o.hits: counters (a change starts recoil / a hit reaction) ·
   * o.reload: progress 0..1, otherwise −1 · o.ms 0..1: share of the mesh space blend at spine_01 (1 = the chest ignores what the
   * hips do, 0 = it follows them) · o.snap: no blending this frame (teleport) · o.move 0..1: the figure is on the move · o.sprint 0..1 ·
   * o.fp: seen from the figure's own eyes (the weapon is lowered less, so that it stays in the picture)
   */
  apply(dt, o) {
    if (!this.ready) return;
    const want = o.armed ? 1 : 0, T = TUNE;
    if (o.armed && !this.armed) { this.kind = KINDS[o.kind] ? o.kind : 'rifle'; this.warm(this.kind); if (!o.snap) this.equipT = 0; }
    else if (o.armed && o.kind !== this.kind && KINDS[o.kind]) { this.kind = o.kind; this.warm(this.kind); this.equipT = o.snap ? 9 : 0; }
    this.armed = !!o.armed;
    this.w = o.snap ? want : clamp(this.w + Math.sign(want - this.w) * dt / T.blend, 0, 1);
    this.mount.visible = this.w > 0.35;
    // counters: the first value only sets the start
    // a shot brings the weapon up in this very frame: the tracer starts at the muzzle and has to leave along the barrel
    let shotNow = false;
    if (o.shots !== undefined) { if (this.shots >= 0 && o.shots !== this.shots) { shotNow = true; this.carryW = 0; this.lowW = 0; } this.shots = o.shots; }
    if (o.hits !== undefined) { if (this.hits >= 0 && o.hits !== this.hits && this.hitT > 0.25) { this.hitT = 0; this.hitClip = HITS[Math.floor(Math.random() * HITS.length)]; } this.hits = o.hits; }
    if (o.toss !== undefined) { if (this.tosses >= 0 && o.toss !== this.tosses) this.tossT = 0; this.tosses = o.toss; }
    this.t += dt; this.fireT += dt; this.hitT += dt; this.equipT += dt; this.tossT += dt;
    // the recoil starts one frame after the shot (and fades in over 30 ms): in the frame of the shot the barrel still points at the aim
    // point, the tracer leaves along it. The pistol and shotgun clips begin fully kicked (6 to 9 degrees).
    if (shotNow) this.fireT = 0;
    this.fitW = 0; this._addW = 0;
    if (this.w <= 0.001) { this.ikW = 0; this.aimW = 0; this.carryW = 0; this.lowW = 0; return; }
    const K = KINDS[this.kind], cw = clamp(o.crouchW || 0, 0, 1);
    const reloading = o.reload !== undefined && o.reload >= 0;
    this.aimW = o.snap ? (o.aim ? 1 : 0) : this.aimW + ((o.aim && !reloading ? 1 : 0) - this.aimW) * Math.min(1, dt * T.aimRate);
    // ---- base stance
    const pose = this.pose;
    if (!this._loop(K.hip, pose)) return;
    if (this.aimW > 0.001 && this._loop(K.ads, this._tmp)) this._mix(pose, this._tmp, this.aimW);
    if (cw > 0.001 && this._loop(K.crouch, this._tmp)) this._mix(pose, this._tmp, cw);
    // carry: on the move without aiming the weapon comes down across the body; a shot, aiming, reloading or a throw bring it up at once
    const calm = !o.aim && !reloading && this.fireT > T.carryAfterFire && this.tossT > 1.2 && this.equipT > 1.2;
    const mv = clamp(o.move || 0, 0, 1), sprintW = clamp(o.sprint || 0, 0, 1);
    const wantCarry = calm && cw < 0.5 ? mv * (o.fp ? T.carryFp[0] + (T.carryFp[1] - T.carryFp[0]) * sprintW : 1) : 0;
    this.carryW = o.snap ? wantCarry : this.carryW + (wantCarry - this.carryW) * Math.min(1, dt * (wantCarry > this.carryW ? T.carryIn : T.carryOut));
    this.carryT += dt * (T.carryRate[0] + (T.carryRate[1] - T.carryRate[0]) * sprintW);
    const cr = this.carryW > 0.001 ? this._clip(K.carry) : null;
    if (cr) this._mix(pose, this._sample(cr, cr.dur > 0 ? this.carryT % cr.dur : 0, this._tmp), this.carryW);
    // standing relaxed: the weapon sinks a little (through the aim offsets below)
    const wantLow = calm && this.fireT > T.lowReadyAfter && mv < 0.3 ? 1 : 0;
    this.lowW = o.snap ? wantLow : this.lowW + (wantLow - this.lowW) * Math.min(1, dt * (wantLow > this.lowW ? T.lowReadyIn : T.carryOut));
    // equip: once when the weapon is taken, then into the stance
    const eq = this._clip(K.equip);
    let busy = 0;
    if (eq && this.equipT < eq.dur) {
      const k = clamp((eq.dur - this.equipT) / T.equipOut, 0, 1);
      this._mix(pose, this._sample(eq, this.equipT, this._tmp), k); busy = k;
    }
    // grenade toss: the left hand throws, the right keeps the weapon (one clip for all kinds: Lyra has it for the rifle only)
    const ts = this._clip(TOSS);
    if (ts && this.tossT < ts.dur) {
      const k = Math.min(1, this.tossT / 0.1, (ts.dur - this.tossT) / 0.22);
      this._mix(pose, this._sample(ts, this.tossT, this._tmp), k); busy = Math.max(busy, k);
    }
    // reload: the clip stretched over the reload time of the weapon
    const rl = this._clip(K.reload);
    if (reloading) this.reloadP = o.reload;
    this.reloadW = clamp(this.reloadW + (reloading ? 1 : -1) * dt / T.reloadBlend, 0, 1);
    if (rl && this.reloadW > 0.001) { this._mix(pose, this._sample(rl, clamp(this.reloadP, 0, 1) * rl.dur, this._tmp), this.reloadW); busy = Math.max(busy, this.reloadW); }
    // ---- write the bones: spine_01 partly in mesh space (pelvis of the stance · spine of the stance, seen from the pelvis the legs have now)
    const W = this.w, q = pose.q, ms = clamp(o.ms ?? 1, 0, 1), sp = this.B[0];
    _a.fromArray(q, 0);
    if (ms > 0.001) {
      _b.copy(this.pelvis.quaternion).invert().multiply(_c.fromArray(pose.pel, 0)).multiply(_a);
      _a.slerp(_b, ms);
    }
    sp.quaternion.slerp(_a, W);
    for (let b = 1; b < this.N; b++) this.B[b].quaternion.slerp(_a.fromArray(q, b * 4), W);
    this.wr.position.lerp(_v1.fromArray(pose.wp, 0), W);
    // ---- aim: deltas of the aim offset poses, blended between the stances like the stances themselves
    const yaw = clamp(o.yaw || 0, -180, 180), pitch = clamp((o.pitch || 0) - (o.fp ? T.lowReadyFp : T.lowReady) * this.lowW * (1 - this.aimW) * (1 - cw), -90, 90);
    const ix = clamp(Math.floor((yaw + 180) / 90), 0, AO_COLS.length - 2), fx = (yaw - AO_COLS[ix][1]) / 90;
    const iy = pitch < 0 ? 0 : 1, fy = (pitch - AO_ROWS[iy][1]) / 90;
    if (Math.abs(yaw) > 0.2 || Math.abs(pitch) > 0.2) {
      const src = [[this._grid(K.ao.hip), (1 - this.aimW) * (1 - cw)], [this._grid(K.ao.ads), this.aimW * (1 - cw)], [this._grid(K.ao.crouch), cw]];
      const cor = [[ix, iy, (1 - fx) * (1 - fy)], [ix + 1, iy, fx * (1 - fy)], [ix, iy + 1, (1 - fx) * fy], [ix + 1, iy + 1, fx * fy]];
      const kA = W * (1 - busy * 0.5) * (1 - this.carryW * (1 - T.carryAim));
      for (let b = 0; b < this.N; b++) {
        if (b === this.iW) continue;
        let X = 0, Y = 0, Z = 0, Wq = 0;
        for (const [g, gw] of src) {
          if (!g || gw < 0.001) continue;
          for (const [cx, cy, cwt] of cor) { if (cwt <= 0) continue; const d = g[cx][cy], k = gw * cwt, i4 = b * 4; X += d[i4] * k; Y += d[i4 + 1] * k; Z += d[i4 + 2] * k; Wq += d[i4 + 3] * k; }
        }
        const n = Math.hypot(X, Y, Z, Wq);
        if (n < 1e-6 || Wq / n > 0.999999) continue;
        _acc.set(X / n, Y / n, Z / n, Wq / n);
        this.B[b].quaternion.premultiply(kA >= 0.999 ? _acc : _c.copy(ID).slerp(_acc, kA));
      }
    }
    // how far the barrel may be turned onto the aim point: not while the weapon is carried, lowered or busy (reload, equip, throw)
    this.fitW = W * (1 - busy) * (1 - this.carryW) * (1 - this.lowW * (1 - this.aimW) * (o.fp ? T.lowReadyFp : T.lowReady) / 7);
    this.fitW = clamp(this.fitW, 0, 1);
    // ---- additive: recoil and hit
    this._addW = W; this._addFire = !reloading;
    if (!o.late) this.additive();
    this.ikW = W * K.ik * (1 - busy);
  }

  /** recoil and hit reaction on top of the pose; with o.late the owner calls this after turning the barrel onto the aim point */
  additive() {
    const W = this._addW, K = KINDS[this.kind], T = TUNE;
    if (W <= 0.001) return;
    this._addW = 0;
    if (this._addFire) this._additive(K.fire, this.fireT, -1, W * T.fireGain, 0.03);
    this._additive(this.hitClip, this.hitT, 0, W * T.hitGain);
  }

  /** after the world transform of this frame is set: left hand onto the fore grip of the carried weapon */
  finalize() {
    if (!this.ready || !this.ikL || !this.grip || this.ikW < 0.01) return;
    const { thigh: ua, calf: la, foot: hd } = this.ikL;
    this.socket.updateWorldMatrix(true, false);
    const target = this.socket.localToWorld(_v1.copy(this.grip));
    // the elbow stays on its side: bend towards where it points now
    ua.updateWorldMatrix(true, false); la.updateWorldMatrix(false, false); hd.updateWorldMatrix(false, false);
    const S0 = ua.getWorldPosition(_v2), E = la.getWorldPosition(_v3), H = hd.getWorldPosition(_v4);
    H.sub(S0); E.sub(S0); E.addScaledVector(H, -E.dot(H) / Math.max(1e-6, H.lengthSq()));
    if (E.lengthSq() > 1e-6) this.ikL.fwd.copy(E).normalize(); else this.ikL.fwd.set(0, -1, 0);
    this.ikL.solve(target, this.ikW);
  }
}
