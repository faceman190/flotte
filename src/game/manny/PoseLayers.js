// PoseLayers – poses of the clip set that are added ON TOP of whatever the animator plays.
//
//  look:  the 42 aim offset poses (M_Neutral_AO_Stand / _Crouch, yaw −135…+135 in steps of 45, pitch −90 / 0 / +90).
//         Head and chest follow the view: up and down with the camera, sideways as long as the feet have not turned yet.
//         Only the upper body takes part (spine, neck, head, shoulders, upper arms) – the legs stay with the locomotion.
//  lean:  the lean poses of running and sprinting (…Lean_Pose_Left / _Right, …Lean_L_hold / _R_hold against their base pose):
//         the body tips into the curve, the head leads.
//
// A pose is stored as the rotation that turns its base pose into it, per bone and in the frame of the bone's PARENT
// (delta = pose · base⁻¹). Added by pre-multiplying, the bend keeps its direction whatever the bone is doing at the moment.
// apply() has to run after the mixer and after Inertializer.savePure(), before Inertializer.apply(): then the blends see the
// layers as part of the pose and the next frame starts clean again.
import * as THREE from 'three';

const XS = [-135, -90, -45, 0, 45, 90, 135], YS = [-90, 0, 90];
const LOOK_BONES = /^(spine_0\d|neck_0\d|head|clavicle_[lr]|upperarm_[lr])$/;
const sgn = (v) => (v > 0 ? '+' + v : '' + v);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const _acc = new THREE.Quaternion(), _q = new THREE.Quaternion(), ID = new THREE.Quaternion();

export class PoseLayers {
  /** clips: ClipStore (has / pose) */
  constructor(model, clips) {
    this.bones = new Map();
    model.traverse((o) => { if (o.isBone) this.bones.set(o.name, o); });
    this.look = {};
    for (const st of ['Stand', 'Crouch']) {
      const N = 'M_Neutral_AO_' + st + '_';
      if (!clips.has(N + 'X0_Y0')) continue;
      const base = clips.pose(N + 'X0_Y0');
      const grid = XS.map((x) => YS.map((y) => this._delta(base, clips.has(`${N}X${sgn(x)}_Y${sgn(y)}`) ? clips.pose(`${N}X${sgn(x)}_Y${sgn(y)}`) : null, LOOK_BONES)));
      const names = [...new Set(grid.flat().flatMap((m) => [...m.keys()]))];
      this.look[st.toLowerCase()] = { grid, bones: names.map((n) => this.bones.get(n)), names };
    }
    this.lean = {};
    for (const [key, base, left, right] of [
      ['run', 'M_Neutral_Run_Lean_Pose_Base', 'M_Neutral_Run_Lean_Pose_Left', 'M_Neutral_Run_Lean_Pose_Right'],
      ['sprint', 'M_Neutral_Sprint_Pose_Lean_base', 'M_Neutral_Sprint_Pose_Lean_L_hold', 'M_Neutral_Sprint_Pose_Lean_R_hold']]) {
      if (!clips.has(base) || !clips.has(left) || !clips.has(right)) continue;
      const b = clips.pose(base);
      this.lean[key] = { left: [...this._delta(b, clips.pose(left), null)], right: [...this._delta(b, clips.pose(right), null)] };
    }
    this.ready = !!(this.look.stand || this.lean.run);
  }

  _delta(base, pose, allow) {
    const m = new Map();
    if (!pose) return m;
    for (const [n, q] of pose) {
      if (n === 'root' || (allow && !allow.test(n)) || !this.bones.has(n) || !base.has(n)) continue;
      const d = q.clone().multiply(base.get(n).clone().invert());
      if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
      if (2 * Math.acos(Math.min(1, d.w)) > 0.5 * Math.PI / 180) m.set(n, d);
    }
    return m;
  }

  /**
   * o.yaw / o.pitch: where the view points relative to the body, deg (yaw + = right, pitch + = up) · o.lookW 0..1 ·
   * o.crouchW 0..1 · o.lean −1..1 (+ = curve to the left) · o.sprintW 0..1 (share of the sprint lean)
   */
  apply(o) {
    const lw = o.lookW ?? 0;
    if (lw > 0.001) {
      const x = clamp(o.yaw || 0, -135, 135), y = clamp(o.pitch || 0, -90, 90);
      const ix = Math.min(XS.length - 2, Math.max(0, Math.floor((x + 135) / 45))), fx = (x - XS[ix]) / 45;
      const iy = y < 0 ? 0 : 1, fy = (y - YS[iy]) / 90;
      for (const [key, w] of [['stand', 1 - (o.crouchW || 0)], ['crouch', o.crouchW || 0]]) {
        const L = this.look[key], k = w * lw;
        if (!L || k < 0.001) continue;
        const c = [[L.grid[ix][iy], (1 - fx) * (1 - fy)], [L.grid[ix + 1][iy], fx * (1 - fy)], [L.grid[ix][iy + 1], (1 - fx) * fy], [L.grid[ix + 1][iy + 1], fx * fy]];
        for (let i = 0; i < L.names.length; i++) {
          const n = L.names[i];
          _acc.set(0, 0, 0, 0);
          for (const [m, cw] of c) {
            if (cw <= 0) continue;
            const d = m.get(n) || ID;                          // all deltas have w >= 0: same hemisphere
            _acc.x += d.x * cw; _acc.y += d.y * cw; _acc.z += d.z * cw; _acc.w += d.w * cw;
          }
          _acc.normalize();
          L.bones[i].quaternion.premultiply(_q.copy(ID).slerp(_acc, k));
        }
      }
    }
    const ln = o.lean || 0;
    if (Math.abs(ln) > 0.001) {
      for (const [key, w] of [['run', 1 - (o.sprintW || 0)], ['sprint', o.sprintW || 0]]) {
        const L = this.lean[key] || this.lean.run, k = Math.abs(ln) * w;
        if (!L || k < 0.001) continue;
        for (const [n, d] of (ln > 0 ? L.left : L.right)) this.bones.get(n).quaternion.premultiply(_q.copy(ID).slerp(d, k));
      }
    }
  }
}
