// Foot locking with an analytic two-bone IK (thigh -> calf -> foot) per leg.
// A foot that has ground contact according to the current clip is pinned to its world position;
// when the clip lifts it (or it drifts too far) the lock is released smoothly.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();

function rotateBoneWorld(bone, qWorld) {
  // apply a world-space rotation to a bone (keeps its children attached)
  bone.parent.getWorldQuaternion(_pq);
  _q2.copy(_pq).invert().multiply(qWorld).multiply(_pq);
  bone.quaternion.premultiply(_q2);
  bone.updateMatrixWorld(true);
}

export class TwoBoneIK {
  constructor(thigh, calf, foot) { this.thigh = thigh; this.calf = calf; this.foot = foot; }

  /** move the foot (ankle) to world position target (optionally world rotation targetQ), weight 0..1 */
  solve(target, weight = 1, targetQ = null) {
    if (weight <= 0.001) return;
    const { thigh, calf, foot } = this;
    thigh.updateMatrixWorld(true);
    const footQ = foot.getWorldQuaternion(new THREE.Quaternion());
    if (targetQ) footQ.slerp(targetQ, weight);
    const H = thigh.getWorldPosition(new THREE.Vector3());
    const K = calf.getWorldPosition(new THREE.Vector3());
    const A = foot.getWorldPosition(new THREE.Vector3());
    _t.copy(A).lerp(target, weight);
    const la = H.distanceTo(K), lb = K.distanceTo(A);
    const lc = Math.min(Math.max(H.distanceTo(_t), Math.abs(la - lb) + 1e-3), la + lb - 1e-3);
    // 1) knee angle
    _a.copy(H).sub(K).normalize(); _b.copy(A).sub(K).normalize();
    const cur = Math.acos(Math.min(1, Math.max(-1, _a.dot(_b))));
    const want = Math.acos(Math.min(1, Math.max(-1, (la * la + lb * lb - lc * lc) / (2 * la * lb))));
    _c.crossVectors(_a, _b);
    if (_c.lengthSq() < 1e-8) _c.set(1, 0, 0); else _c.normalize();
    _q.setFromAxisAngle(_c, want - cur);
    rotateBoneWorld(calf, _q);
    // 2) aim thigh so the ankle points at the target
    const A2 = foot.getWorldPosition(new THREE.Vector3());
    _a.copy(A2).sub(H).normalize(); _b.copy(_t).sub(H).normalize();
    _q.setFromUnitVectors(_a, _b);
    rotateBoneWorld(thigh, _q);
    // 3) keep the animated foot orientation
    calf.getWorldQuaternion(_pq);
    foot.quaternion.copy(_pq.invert().multiply(footQ));
    foot.updateMatrixWorld(true);
  }
}

export class FootLocker {
  constructor(model, opts = {}) {
    this.model = model;
    this.releaseTime = opts.releaseTime ?? 0.15;
    this.maxDrift = opts.maxDrift ?? 0.15;
    this.follow = opts.follow ?? 3;          // 1/s – a locked foot slowly follows the animation (no big jump on release)
    this.legs = ['l', 'r'].map((s) => {
      const thigh = model.getObjectByName('thigh_' + s), calf = model.getObjectByName('calf_' + s), foot = model.getObjectByName('foot_' + s);
      const ball = model.getObjectByName('ball_' + s) || foot;
      return thigh && calf && foot ? { side: s, ik: new TwoBoneIK(thigh, calf, foot), foot, ball, locked: false, w: 0, lockPos: new THREE.Vector3() } : null;
    }).filter(Boolean);
    this.enabled = true;
  }

  /** contacts: {l: bool, r: bool} from the current clip; enabled false (e.g. in the air) releases everything */
  update(dt, contacts, enabled = true, follow = this.follow, maxDrift = this.maxDrift) {
    this.model.updateMatrixWorld(true);
    for (const leg of this.legs) {
      // the BALL of a planted foot is pinned (it is the pivot when the heel lifts or the body turns);
      // the ankle target keeps the animated ankle->ball offset, the foot keeps its animated rotation
      const ball = leg.ball.getWorldPosition(new THREE.Vector3());
      const ankle = leg.foot.getWorldPosition(new THREE.Vector3());
      const want = enabled && this.enabled && contacts[leg.side];
      if (want && !leg.locked && leg.w <= 0) { leg.locked = true; leg.lockPos.copy(ball); leg.w = 1; }
      if (leg.locked) leg.lockPos.lerp(ball, 1 - Math.exp(-dt * follow));
      if (leg.locked && (!want || ball.distanceTo(leg.lockPos) > maxDrift)) leg.locked = false;
      if (!leg.locked && leg.w > 0) leg.w = Math.max(0, leg.w - dt / this.releaseTime);
      if (leg.w > 0) leg.ik.solve(_t.copy(leg.lockPos).add(ankle).sub(ball).clone(), leg.locked ? 1 : leg.w);
    }
  }

  reset() { for (const l of this.legs) { l.locked = false; l.w = 0; } }
}
