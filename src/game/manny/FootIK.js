// Foot locking with an analytic two-bone IK (thigh -> calf -> foot) per leg.
// A foot that has ground contact according to the current clip is pinned to its world position;
// when the clip lifts it (or it drifts too far) the lock is released smoothly.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Vector3(), _h = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _inv = new THREE.Matrix4();

function rotateBoneWorld(bone, qWorld) {
  // apply a world-space rotation to a bone (keeps its children attached)
  bone.parent.getWorldQuaternion(_pq);
  _q2.copy(_pq).invert().multiply(qWorld).multiply(_pq);
  bone.quaternion.premultiply(_q2);
  bone.updateMatrixWorld(true);
}

export class TwoBoneIK {
  constructor(thigh, calf, foot) { this.thigh = thigh; this.calf = calf; this.foot = foot; this.fwd = new THREE.Vector3(0, 0, 1); }   // fwd: world direction the knee bends towards

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
    // bend axis: from the current bend; an (almost) straight leg has none, or a tiny one the wrong way round (then the foot
    // went down instead of up) - there the knee bends towards fwd
    _c.crossVectors(_a, _b);
    _r.crossVectors(this.fwd, _h.copy(H).sub(A));
    if (_r.lengthSq() > 1e-8) { _r.normalize(); if (_c.length() < 0.12 || _c.dot(_r) < 0) _c.copy(_r); else _c.normalize(); }
    else if (_c.lengthSq() < 1e-8) _c.set(1, 0, 0); else _c.normalize();
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

  /** contacts: {l: bool, r: bool} from the current clip; enabled false (e.g. in the air) releases everything.
   *  space: world matrix of the room the character stands in (a station deck, a ship). The lock positions live in that
   *  room, so a moving or turning room (a flying ship) takes the planted feet along instead of dragging them. null = world. */
  update(dt, contacts, enabled = true, follow = this.follow, maxDrift = this.maxDrift, space = null) {
    this.model.updateMatrixWorld(true);
    if (space) _inv.copy(space).invert();
    _f.set(0, 0, 1).transformDirection(this.model.matrixWorld);
    for (const leg of this.legs) {
      leg.ik.fwd.copy(_f);
      // the BALL of a planted foot is pinned (it is the pivot when the heel lifts or the body turns);
      // the ankle target keeps the animated ankle->ball offset, the foot keeps its animated rotation
      const ballW = leg.ball.getWorldPosition(new THREE.Vector3());
      const ankle = leg.foot.getWorldPosition(new THREE.Vector3());
      const ball = space ? ballW.clone().applyMatrix4(_inv) : ballW;          // room space
      const want = enabled && this.enabled && contacts[leg.side];
      if (want && !leg.locked && leg.w <= 0) { leg.locked = true; leg.lockPos.copy(ball); leg.w = 1; }
      if (leg.locked) leg.lockPos.lerp(ball, 1 - Math.exp(-dt * follow));
      leg.lockPos.y = ball.y;                 // pinned in the plane only: the height comes from the animation and the ground under the foot
      if (leg.locked && (!want || ball.distanceTo(leg.lockPos) > maxDrift)) leg.locked = false;
      if (!leg.locked && leg.w > 0) leg.w = Math.max(0, leg.w - dt / this.releaseTime);
      if (leg.w > 0) {
        _t.copy(leg.lockPos); if (space) _t.applyMatrix4(space);              // back to world
        leg.ik.solve(_t.add(ankle).sub(ballW).clone(), leg.locked ? 1 : leg.w);
      }
    }
  }

  reset() { for (const l of this.legs) { l.locked = false; l.w = 0; } }
}

/**
 * Feet follow the ground (slopes, steps, ramps): the height of the floor under each foot is compared with the height the
 * character stands on; the hips sink to the lower foot and each leg is bent by IK so that the foot keeps the clearance
 * the animation gave it – above the real floor instead of an imaginary flat one.
 */
export class GroundAdapt {
  constructor(model, opts = {}) {
    this.model = model;
    this.maxStep = opts.maxStep ?? 0.38;       // m – larger differences are a wall or a drop, not a step
    this.rate = opts.rate ?? 12;               // 1/s – how fast the offsets follow
    this.pelvis = model.getObjectByName('pelvis');
    this.legs = ['l', 'r'].map((s) => {
      const thigh = model.getObjectByName('thigh_' + s), calf = model.getObjectByName('calf_' + s), foot = model.getObjectByName('foot_' + s);
      return thigh && calf && foot ? { ik: new TwoBoneIK(thigh, calf, foot), foot, off: 0 } : null;
    }).filter(Boolean);
    this.hip = 0; this.fresh = true;
  }

  /** ground(x, z) -> floor height in room space (null: unknown) · baseY: room-space height the character stands on
   *  space: world matrix of the room (null = world) · enabled false (in the air): offsets fade out */
  update(dt, ground, baseY, space = null, enabled = true) {
    if (!this.pelvis || this.legs.length < 2) return;
    this.model.updateMatrixWorld(true);
    if (space) _inv.copy(space).invert();
    const k = this.fresh && enabled ? 1 : 1 - Math.exp(-dt * this.rate);   // right after a reset (spawn, teleport): no fade-in
    if (enabled) this.fresh = false;
    const ankles = [];
    let low = 0;
    for (const leg of this.legs) {
      const w = leg.foot.getWorldPosition(new THREE.Vector3());
      ankles.push(w);
      let want = 0;
      if (enabled) {
        const r = space ? _a.copy(w).applyMatrix4(_inv) : _a.copy(w);
        const g = ground(r.x, r.z);
        if (g !== null && g !== undefined && Number.isFinite(g) && Math.abs(g - baseY) <= this.maxStep) want = g - baseY;
      }
      leg.off += (want - leg.off) * k;
      low = Math.min(low, leg.off);
    }
    // hips: down to the lower foot (never up – the higher foot bends its leg instead)
    this.hip += (low - this.hip) * k;
    this.active = true;
    if (Math.abs(this.hip) < 1e-4 && this.legs.every((l) => Math.abs(l.off) < 1e-4)) return;
    const up = _u.set(0, 1, 0); if (space) up.transformDirection(space);   // own vector: solve() uses the shared temporaries
    const p = this.pelvis.getWorldPosition(new THREE.Vector3()).addScaledVector(up, this.hip);
    this.pelvis.position.copy(this.pelvis.parent.worldToLocal(p));
    this.pelvis.updateMatrixWorld(true);
    _f.set(0, 0, 1).transformDirection(this.model.matrixWorld);
    this.legs.forEach((leg, i) => { leg.ik.fwd.copy(_f); leg.ik.solve(ankles[i].addScaledVector(up, leg.off), 1); });
  }

  reset() { this.hip = 0; this.fresh = true; for (const l of this.legs) l.off = 0; }
}
