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
    this.active = false;
    this.pending = false;
    this.t = 0;
    this.duration = 0.2;
    this._q = new THREE.Quaternion();
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
    if (this.pending) {
      for (let i = 0; i < this.bones.length; i++) {
        const b = this.bones[i];
        this.offQ[i].copy(this.snapQ[i]).multiply(this._q.copy(b.quaternion).invert());   // snap * new^-1
        if (this.offQ[i].w < 0) { const q = this.offQ[i]; q.set(-q.x, -q.y, -q.z, -q.w); }
        this.offP[i].copy(this.snapP[i]).sub(b.position);
      }
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
