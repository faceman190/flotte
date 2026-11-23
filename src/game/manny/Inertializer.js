// Inertialization: on a transition the new animation plays at full weight immediately; the difference
// between the last shown pose and the new pose is kept as a per-bone offset that decays with a critically
// damped curve  x(t) = x0 * (1 + w t) * e^(-w t)  (no velocity jump, no "mushy" crossfade).
import * as THREE from 'three';

const IDENT = new THREE.Quaternion();

export class Inertializer {
  constructor(root) {
    this.bones = [];
    root.traverse((o) => { if (o.isBone) this.bones.push(o); });
    const n = this.bones.length;
    this.snapQ = this.bones.map(() => new THREE.Quaternion());
    this.snapP = this.bones.map(() => new THREE.Vector3());
    this.offQ = this.bones.map(() => new THREE.Quaternion());
    this.offP = this.bones.map(() => new THREE.Vector3());
    // the pose shown in the last two frames (after the offsets, before IK): gives every bone its velocity at a transition
    this.shownQ = this.bones.map(() => new THREE.Quaternion()); this.shownP = this.bones.map(() => new THREE.Vector3());
    this.prevQ = this.bones.map(() => new THREE.Quaternion()); this.prevP = this.bones.map(() => new THREE.Vector3());
    this.shownDt = 0; this.frames = 0; this.velocity = true;
    this.active = false;
    this.pending = false;
    this.t = 0;
    this.duration = 0.2;
    this._q = new THREE.Quaternion(); this._d = new THREE.Quaternion(); this._v = new THREE.Vector3();
    this.count = 0;
  }

  // three.js' PropertyMixer only writes a bone property when the animated value CHANGED since the last
  // frame. Anything we add on top (inertialization offsets, IK) would therefore stick and accumulate on
  // bones with constant values. So: save the pure animated pose right after mixer.update() and restore
  // it right before the next mixer.update().
  savePure() {
    if (!this.pureQ) { this.pureQ = this.bones.map(() => new THREE.Quaternion()); this.pureP = this.bones.map(() => new THREE.Vector3()); this.pureS = this.bones.map(() => new THREE.Vector3()); }
    for (let i = 0; i < this.bones.length; i++) { const b = this.bones[i]; this.pureQ[i].copy(b.quaternion); this.pureP[i].copy(b.position); this.pureS[i].copy(b.scale); }
  }
  restorePure() {
    if (!this.pureQ) return;
    for (let i = 0; i < this.bones.length; i++) { const b = this.bones[i]; b.quaternion.copy(this.pureQ[i]); b.position.copy(this.pureP[i]); b.scale.copy(this.pureS[i]); }
  }

  /** call BEFORE the mixer applies the new pose (bones still show the last frame) */
  request(duration = 0.2) {
    if (duration <= 0) return;
    for (let i = 0; i < this.bones.length; i++) {
      this.snapQ[i].copy(this.bones[i].quaternion);
      this.snapP[i].copy(this.bones[i].position);
    }
    this.duration = Math.max(duration, 0.05);
    this.pending = true;
    this.count++;
  }

  /** call AFTER mixer.update(dt) */
  apply(dt) {
    this._apply(dt);
    // remember what is shown (for the velocity at the next transition)
    for (let i = 0; i < this.bones.length; i++) { const b = this.bones[i]; this.prevQ[i].copy(this.shownQ[i]); this.prevP[i].copy(this.shownP[i]); this.shownQ[i].copy(b.quaternion); this.shownP[i].copy(b.position); }
    this.shownDt = dt; this.frames++;
  }
  _apply(dt) {
    if (this.pending) {
      // The snapshot is the pose of the LAST frame, the new animation is already one frame further. Comparing the two directly
      // would repeat the old pose for one frame (the character freezes while the game moves it on: both feet slide). So the
      // snapshot is first moved on by one frame with the velocity each bone had.
      const r = this.velocity && this.frames >= 2 && this.shownDt > 1e-4 ? Math.min(2, dt / this.shownDt) : 0;
      for (let i = 0; i < this.bones.length; i++) {
        const b = this.bones[i];
        if (r > 0) {
          this._d.copy(this.shownQ[i]).multiply(this._q.copy(this.prevQ[i]).invert());      // rotation of the last frame
          if (this._d.w < 0) this._d.set(-this._d.x, -this._d.y, -this._d.z, -this._d.w);
          this._q.copy(IDENT).slerp(this._d, r);
          this.snapQ[i].premultiply(this._q);
          this.snapP[i].addScaledVector(this._v.copy(this.shownP[i]).sub(this.prevP[i]), r);
        }
        this.offQ[i].copy(this.snapQ[i]).multiply(this._q.copy(b.quaternion).invert());   // snap * new^-1
        if (this.offQ[i].w < 0) { const q = this.offQ[i]; q.set(-q.x, -q.y, -q.z, -q.w); }
        this.offP[i].copy(this.snapP[i]).sub(b.position);
      }
      // size of this transition: mean rotation offset over all bones (deg) - how far apart the two poses were (tests)
      let sum = 0; for (let i = 0; i < this.bones.length; i++) sum += 2 * Math.acos(Math.min(1, Math.abs(this.offQ[i].w)));
      this.lastJump = sum / (this.bones.length || 1) * 180 / Math.PI; this.jumpSum = (this.jumpSum || 0) + this.lastJump; this.jumpMax = Math.max(this.jumpMax || 0, this.lastJump);
      this.pending = false; this.active = true; this.t = 0;
    } else if (this.active) {
      this.t += dt;
    }
    if (!this.active) return;
    const w = 4.74 / this.duration, x = w * this.t;
    const k = (1 + x) * Math.exp(-x);
    if (k < 0.01) { this.active = false; return; }
    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i];
      this._q.copy(IDENT).slerp(this.offQ[i], k);
      b.quaternion.premultiply(this._q);
      b.position.addScaledVector(this.offP[i], k);
    }
  }
}
