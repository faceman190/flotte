// MannyAnimator v2 – reusable animation brain for the UE5 Manny GLB (Three.js r170).
//
//   const anim = await new MannyAnimator().load('manny_test_v2.glb');   scene.add(anim.model);
//   each frame:
//     const out = anim.update(dt, { moveDir, gait, crouch, strafe, facing, jump, grounded, verticalSpeed });
//     controller.update(dt, out.delta, out.jumpImpulse);
//     anim.model.position.copy(controller.pos); anim.model.rotation.y = out.facing;
//     anim.finalize(dt);            // foot locking IK (needs the final world transform of this frame)
//
// Input: moveDir THREE.Vector2 (world x,z, length 0..1) · gait 'walk'|'run'|'sprint' · crouch · strafe
//        (true: body faces `facing`, 8-way movement) · facing (yaw rad) · jump · grounded · verticalSpeed
// Output: { delta: planar world displacement, facing: yaw, jumpImpulse }
//
// Capsule-led mode (the game moves the character, not the root motion) – optional inputs:
//   vel       THREE.Vector2, the REAL planar velocity (same frame as moveDir). Then:
//             * loops play at real speed / clip speed (0.6..1.3)
//             * starts are played by DISTANCE: clip time = time at which the clip has travelled as far as the capsule
//             * stops are entered and played by REMAINING distance (stopDist), see below
//             * all speed decisions (tap, jump, landing, pose cost) use the real speed
//   stopDist  metres the capsule will still travel after the input was released (prediction of the game)
// moveDir is then the INTENT (keys), not the velocity: releasing the keys starts the stop at once.
//
// (v4, a motion matching search over all starts / loops / stops / pivots, was built on 2026-11-23, measured worse than these
//  states with this clip set and removed again – docs/manny.md. What stayed: the clean gait cycles of the loops, GaitCycle.js.)
//   anim.teleport(facing)       after spawning / being moved: no turn clip, no blend, foot locks dropped
//   anim.finalize(dt, env)      env = { space: Matrix4 world matrix of the room the character stands in (foot locks live there),
//                                       ground: (x, z) => height in room space | null, baseY: room-space height of the feet }
//
// v2 ("motion matching light"):
//  * every clip is analysed at load (ClipFeatures): root motion, turn angle, foot contacts, foot pose/velocity
//  * starts / stops / turns / pivots / moving turns are chosen from candidate groups by angle, speed and
//    POSE (where the feet are and how they move right now) – including the start offset inside the clip
//  * transitions use inertialization instead of crossfades
//  * feet with ground contact are locked with a two-bone IK while the body turns / transitions
//  * turn-in-place: 45/90/135/180 clips, root rotation scaled to the exact angle, chained when turning on
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CLIP_MAP, DIR_PRIORITY, DIR_PRIORITY_ALT, SIDE_MAIN, SIDE_ALT, TUNING } from './clipMap.js';
import { ClipFeatureExtractor, poseCost } from './ClipFeatures.js';
import { Inertializer } from './Inertializer.js';
import { FootLocker, GroundAdapt } from './FootIK.js';
import { findCycle } from './GaitCycle.js';
import { ClipStore } from './ClipStore.js';
import { PoseLayers } from './PoseLayers.js';
import { WeaponLayer } from './WeaponLayer.js';

const DEG = 180 / Math.PI, RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const wrapDeg = (a) => ((a + 180) % 360 + 360) % 360 - 180;
const wrapRad = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (cur, target, maxStep) => cur + Math.max(-maxStep, Math.min(maxStep, target - cur));
const approachAngle = (cur, target, maxStep) => cur + Math.max(-maxStep, Math.min(maxStep, wrapRad(target - cur)));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ROOT_ONLY = new Set(['root']);

// the relaxed style (stations, towns): the same map with the walk, run and stand clips of the Relaxed set (sprint and crouch stay neutral;
// the calm start and stop of the run go through the walk loops, so walk has to change with it).
// Its sideways loops are named differently (LR_offset / RR_offset).
function relaxedMap(map) {
  const re = (x) => (x instanceof RegExp ? new RegExp(x.source.replace(/M_Neutral_(Walk|Run|Stand)/g, 'M_Relaxed_$1'), x.flags) : typeof x === 'string' ? x.replace(/^M_Neutral_(Walk|Run|Stand)_/, 'M_Relaxed_$1_') : x);
  const deep = (o) => (o && typeof o === 'object' && !(o instanceof RegExp) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v)])) : re(o));
  const m = deep(map);
  m.loops.run = { ...m.loops.run, LR: 'M_Relaxed_Run_Loop_LR_offset', RR: 'M_Relaxed_Run_Loop_RR_offset' };
  m.loops.walk = { ...m.loops.walk, LR: 'M_Relaxed_Walk_Loop_LR_offset', RR: 'M_Relaxed_Walk_Loop_RR_offset' };
  m.idleBreaks = { ...m.idleBreaks, stand: /^M_Relaxed_Stand_Idle_Break_vd+$/ };
  return m;
}

export class MannyAnimator {
  constructor(opts = {}) {
    this.tuning = Object.assign({}, TUNING, opts.tuning || {});
    this.turnRate = opts.turnRate ?? { walk: 300, run: 360, sprint: 220, crouch: 240 };   // deg/s procedural
    this.heavyLandingSpeed = opts.heavyLandingSpeed ?? 7.5;
    this.log = [];
    this.missing = [];
    this.time = 0;
  }

  // ------------------------------------------------------------------ loading
  // url: the clip set – a compact LCA1 file (ClipStore.js; needs modelUrl) or a GLB with clips.
  // modelUrl: the figure comes from its own file (same skeleton: the clips find their bones by name).
  async load(url, onProgress, modelUrl) {
    const get = (u, p) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(u, p);
    const glb = /\.gl(b|tf)(\?|$)/i.test(url);
    const [gltf, body] = await Promise.all([glb ? get(url, onProgress) : null, modelUrl ? get(modelUrl) : null]);
    this.model = (body || gltf).scene;
    this.model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    if (glb) {
      // clips of a GLB behind the same three calls as the ClipStore
      const by = new Map(gltf.animations.map((c) => [c.name, c]));
      this.clips = {
        names: [...by.keys()], has: (n) => by.has(n), duration: (n) => (by.get(n) ? by.get(n).duration : 0),
        clip: (n, o = {}) => { const c = by.get(n).clone(); c.tracks = c.tracks.filter((t) => { const b = t.name.slice(0, t.name.lastIndexOf('.')); return (!o.only || o.only.has(b)) && !(o.skip && o.skip.has(b)); }); return c; },
      };
    } else {
      const rest = new Map();
      this.model.traverse((o) => { if (o.isBone) rest.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() }); });
      this.clips = await ClipStore.load(url, rest, onProgress);
    }
    const t0 = performance.now();
    const fx = new ClipFeatureExtractor(this.model);
    this.feat = {};
    const legs = new Set(fx.restLocal.keys());
    let slice = performance.now(), work = 0;
    for (const name of this.clips.names) {
      // analysing several hundred clips takes a while: yield to the browser every few ms (no long freeze of the running game)
      if (performance.now() - slice > 6) { work += performance.now() - slice; await new Promise((r) => setTimeout(r, 0)); slice = performance.now(); }
      this.feat[name] = fx.analyse(this.clips.clip(name, { only: legs }));
    }
    this.analyseMs = Math.round(work + performance.now() - slice); this.loadMs = Math.round(performance.now() - t0);
    this._buildSets();
    this._buildCycles();
    return this._initInstance();
  }

  /**
   * A second figure on the same skeleton (other players, guards): shares the clip store and everything analysed from it (features,
   * loop sets, cycles) with this animator – nothing is loaded or analysed again – and gets its own mixer, layers and state.
   * model: a fresh copy of the skeleton (figur.ts neuesSkelett).
   */
  spawn(model) {
    const a = new MannyAnimator({ tuning: this.tuning, turnRate: this.turnRate, heavyLandingSpeed: this.heavyLandingSpeed });
    a.model = model;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    for (const k of ['clips', 'feat', 'loopSets', 'loopSetsAlt', 'groups', 'deathClips', 'turn', 'deathLie', 'cycles', 'missing']) a[k] = this[k];
    a.alt = false; a.analyseMs = 0; a.loadMs = 0;
    return a._initInstance();
  }

  /** everything that belongs to one figure (mixer, layers, state) */
  _initInstance() {
    this.mixer = new THREE.AnimationMixer(this.model);
    // Actions are created when a clip is first needed and dropped again when it has not been used for a while (_act, _trim):
    // with several hundred clips, one action each would mean a hundred thousand bound tracks.
    this._acts = new Map();
    this.actions = new Proxy({}, {
      get: (_, n) => (typeof n === 'string' ? this._act(n) : undefined), has: (_, n) => this.clips.has(n),
      ownKeys: () => this.clips.names, getOwnPropertyDescriptor: (_, n) => (this.clips.has(n) ? { enumerable: true, configurable: true } : undefined),
    });
    this.layers = this.clips.pose ? new PoseLayers(this.model, this.clips) : null;
    this._look = { yaw: 0, pitch: 0, w: 0 }; this._lean = 0;
    this.weapon = this.clips._decode ? new WeaponLayer(this.model, this.clips) : null;      // upper body with a weapon in hand (Lyra clips)
    this._ms = 1; this._wSnap = true;
    this.inertializer = new Inertializer(this.model);
    this.footLock = new FootLocker(this.model);
    this.groundAdapt = new GroundAdapt(this.model);
    this._slots = new Map();
    this.state = 'idle'; this.stateTime = 0;
    this.facing = 0; this.gait = 'run'; this.crouch = false; this.crouchW = 0;
    this.locoTheta = 0; this.gaitW = { walk: 0, run: 1, sprint: 0, crouch: 0 }; this.phase = 0;
    this.planarVel = new THREE.Vector3();
    this._locoWeights = new Map(); this.locoSpeed = 0;
    this.oneShot = null; this._yawScale = 1;
    this.curPose = { footL: new THREE.Vector3(), footR: new THREE.Vector3(), velL: new THREE.Vector3(), velR: new THREE.Vector3(), speed: 0 };
    this._slots.set('idle', { w: 1 });
    this._applyWeights();
    this.mixer.update(0);
    this._capturePose(0);
    return this;
  }

  /** the action of a clip, created on first use (in place: without the root track) */
  _act(name) {
    let e = this._acts.get(name);
    if (!e) {
      if (!this.clips || !this.clips.has(name)) return undefined;
      const a = this.mixer.clipAction(this.clips.clip(name, { skip: ROOT_ONLY }));
      a.enabled = true; a.setEffectiveWeight(0); a.play();
      e = { a, used: this.time }; this._acts.set(name, e);
    }
    return e.a;
  }
  /** drop actions that have not carried weight for a while (their clip is rebuilt from the store when needed again) */
  _trim(keep = 96, age = 20) {
    if (this._acts.size <= keep) return;
    for (const [name, e] of this._acts) {
      if (this.time - e.used < age || e.a.getEffectiveWeight() > 0 || name === this.oneShot) continue;
      const clip = e.a.getClip();
      e.a.stop(); this.mixer.uncacheAction(clip); this.mixer.uncacheClip(clip);
      this._acts.delete(name);
    }
  }

  _has(name) {
    if (name && this.clips.has(name)) return true;
    if (name && !this.missing.includes(name)) this.missing.push(name);
    return false;
  }

  _buildSets() {
    const names = this.clips.names;
    // loops per gait, once for each sideways stance (loopSets: LL / RR · loopSetsAlt: LR / RL, see this.alt), and the candidate groups –
    // for each style: neutral (everywhere) and relaxed (stations and towns, see setStyle; only run and stand differ)
    const build = (map) => {
      const loopSets = {}, loopSetsAlt = {};
      for (const [sets, order] of [[loopSets, DIR_PRIORITY], [loopSetsAlt, DIR_PRIORITY_ALT || DIR_PRIORITY]]) {
        for (const [gait, dirs] of Object.entries(map.loops)) {
          const set = [];
          for (const key of order) {
            const name = dirs[key];
            if (!name || !this._has(name)) continue;
            const f = this.feat[name];
            if (set.some((q) => Math.abs(wrapDeg(q.angle - f.dirDeg)) < 20)) continue;   // same direction twice -> skip
            set.push({ key, name, angle: f.dirDeg, speed: f.dist / f.duration, duration: f.duration });
          }
          set.sort((x, y) => x.angle - y.angle);
          sets[gait] = set;
        }
      }
      const group = (m) => Object.fromEntries(Object.entries(m).map(([k, re]) => [k, names.filter((n) => re.test(n))]));
      const groups = {
        starts: group(map.starts), stops: group(map.stops), turnInPlace: group(map.turnInPlace),
        movingTurns: group(map.movingTurns), pivots: group(map.pivots), idleBreaks: group(map.idleBreaks || {}),
      };
      return { loopSets, loopSetsAlt, groups, idleStand: map.idle.stand };
    };
    this._styles = { neutral: build(CLIP_MAP) };
    const R = relaxedMap(CLIP_MAP);
    if (this.clips.has(R.loops.run.F) && this.clips.has(R.idle.stand)) this._styles.relaxed = build(R);
    this._style = 'neutral'; this._useStyle(this._styles.neutral);
    this.alt = false;                                          // sideways stance: false = LL / RR, true = LR / RL
    this.deathClips = CLIP_MAP.death ? names.filter((n) => CLIP_MAP.death.test(n)) : [];
    this.turn = {};
    for (const st of Object.values(this._styles)) for (const list of Object.values(st.groups.pivots)) for (const n of list) {
      const ti = this._turnInfo(this.feat[n]); if (!ti) continue;
      // stance the clip starts from / ends in, from its name (<family>_<from>_<to>_<foot>): null = not sideways
      const m = /_(?:Pivot|Box|Diamond|Hourglass)_([A-Z]+)_([A-Z]+)_/.exec(n), st = (k) => (SIDE_ALT.includes(k) ? true : SIDE_MAIN.includes(k) ? false : null);
      ti.altFrom = m ? st(m[1]) : null; ti.altTo = m ? st(m[2]) : null;
      this.turn[n] = ti;
    }
    // lying pose for each death clip: the one whose pelvis lies most like the clip's last frame
    this.deathLie = new Map();
    const lying = CLIP_MAP.lying && this.clips.pose ? names.filter((n) => CLIP_MAP.lying.test(n)) : [];
    for (const d of this.deathClips) {
      const end = this.clips.pose(d, this.clips.frames(d) - 1).get('pelvis'); let best = null, bd = Infinity;
      for (const l of lying) { const q = this.clips.pose(l, 0).get('pelvis'), x = end && q ? 1 - Math.abs(end.dot(q)) : 1; if (x < bd) { bd = x; best = l; } }
      if (best) this.deathLie.set(d, best);
    }
    [CLIP_MAP.idle.stand, CLIP_MAP.idle.crouch, CLIP_MAP.jump.fall, ...Object.values(CLIP_MAP.jump.start)].forEach((n) => this._has(n));
    for (const v of Object.values(CLIP_MAP.jump.land)) Object.values(v).forEach((n) => this._has(n));
  }

  /**
   * Where a direction change clip changes its direction. The velocity of the root (body frame: forward, right) goes from vA (start
   * of the clip) to vB (end); p = share of that way done, 0..1. Returns { t0, t1: clip times at p = 0.05 / 0.95, tAt: clip time
   * for p = 0, 0.05 … 1 } or null when the clip does not change direction. Played by p, the clip turns when the capsule turns.
   */
  _turnInfo(f) {
    const n = f.n, v = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2), dt = f.ts[b] - f.ts[a];
      const d = f.rootPos[b].clone().sub(f.rootPos[a]).applyAxisAngle(UP, -f.yaw[i]);
      v.push([d.z / dt, -d.x / dt]);
    }
    const k = Math.min(9, n >> 2), mean = (i0, i1) => { let x = 0, y = 0; for (let i = i0; i <= i1; i++) { x += v[i][0]; y += v[i][1]; } return [x / (i1 - i0 + 1), y / (i1 - i0 + 1)]; };
    const vA = mean(0, k), vB = mean(n - 1 - k, n - 1), dx = vB[0] - vA[0], dy = vB[1] - vA[1], dl = dx * dx + dy * dy;
    if (dl < 1) return null;
    const raw = v.map((q) => ((q[0] - vA[0]) * dx + (q[1] - vA[1]) * dy) / dl);
    // the change begins after the last time p was still small (the steps before it make p wobble around 0)
    let i20 = 0; for (let i = n - 1; i >= 0; i--) if (raw[i] < 0.2) { i20 = i; break; }
    const iS = Math.max(0, i20 - 8), p = new Float32Array(n); let m = 0;
    for (let i = iS; i < n; i++) { m = Math.max(m, Math.min(1, raw[i])); p[i] = m; }
    const tAt = new Float32Array(21); let j = iS;
    for (let s = 0; s <= 20; s++) { const want = Math.max(0.02, s / 20); while (j < n - 1 && p[j] < want) j++; tAt[s] = f.ts[j]; }
    return { t0: tAt[1], t1: tAt[19], tAt };
  }

  /** loop speed (m/s) of a gait for a travel direction relative to the body (deg, 0 = forward, + = right) */
  // (always of the main stance: the pace of the game must not depend on which way the hips are turned)
  speedAt(gait, thetaDeg) { let v = 0; for (const [s, w] of this._dirWeights(gait, thetaDeg, false)) v += s.speed * w; return v; }
  /** clean gait cycle of every loop clip (GaitCycle.js): the loops play only that, phase 0 = left foot comes down */
  _buildCycles() {
    const T = this.tuning;
    // whole-body difference of a clip between two times (mean rotation of all bones, deg)
    const ips = new Map(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    const poseDist = (name, ta, tb) => {
      let ip = ips.get(name);
      if (!ip) { ip = this.clips.clip(name).tracks.filter((t) => t.name.endsWith('.quaternion') && !t.name.startsWith('root.')).map((t) => t.createInterpolant()); ips.set(name, ip); }
      let sum = 0;
      for (const it of ip) { qa.fromArray(it.evaluate(ta)); qb.fromArray(it.evaluate(tb)); sum += 2 * Math.acos(Math.min(1, Math.abs(qa.dot(qb)))); }
      return ip.length ? sum / ip.length * DEG : 0;
    };
    // travel speed of a loop = speed over its clean cycle (the whole clip has a held last frame and reads ~1 % slow)
    this.cycles = new Map();
    for (const set of Object.values(this._styles).flatMap((st) => [...Object.values(st.loopSets), ...Object.values(st.loopSetsAlt)])) for (const l of set) {
      let c = this.cycles.get(l.name);
      if (!c) { c = findCycle(this.feat[l.name], { air: T.cycleAir, body: T.cycleBody, poseDist: (ta, tb) => poseDist(l.name, ta, tb) }); this.cycles.set(l.name, c); }
      if (c.speed > 0.2) { l.speed = c.speed; if (T.loopCycles !== false) { l.cyc = c; l.duration = c.b - c.a; } }
    }
  }

  _useStyle(st) { this.loopSets = st.loopSets; this.loopSetsAlt = st.loopSetsAlt; this.groups = st.groups; this._idleStand = st.idleStand; }
  /** style of movement: 'neutral' or 'relaxed' (only if its clips are loaded). Switches in idle and in the loop (phase matched, soft blend);
   *  in a one-shot (start, stop, turn …) it waits for the next idle or loop. Returns the style now in use. */
  setStyle(name) {
    const st = this._styles?.[name]; if (!st || name === this._style) return this._style;
    if (!['idle', 'break', 'loop'].includes(this.state)) return this._style;
    this._style = name; this._useStyle(st);
    if (this.state === 'loop') this._startLoco(this.tuning.styleBlend ?? 0.45); else this._startIdle(this.tuning.styleBlend ?? 0.45);
    return name;
  }
  get style() { return this._style; }

  speedOf(gait) { const s = (this.loopSets[gait] || []).find((l) => l.key === 'F'); return s ? s.speed : 0; }
  groupSizes() { return Object.fromEntries(Object.entries(this.groups).map(([g, v]) => [g, Object.fromEntries(Object.entries(v).map(([k, l]) => [k, l.length]))])); }

  // ------------------------------------------------------------------ pose features of the live character
  _capturePose(dt) {
    const m = this.model;
    m.updateMatrixWorld(true);
    const inv = m.matrixWorld.clone().invert();
    const get = (n) => { const b = m.getObjectByName(n); return b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) : new THREE.Vector3(); };
    const l = get('foot_l'), r = get('foot_r');
    const c = this.curPose;
    if (dt > 0) {
      c.velL.copy(l).sub(c.footL).multiplyScalar(1 / dt);
      c.velR.copy(r).sub(c.footR).multiplyScalar(1 / dt);
      // add the character's own motion (features are root-relative + root motion)
    }
    c.footL.copy(l); c.footR.copy(r);
    c.speed = this.planarVel.length();
  }

  // ------------------------------------------------------------------ weights / transitions
  _blend(dur) {                       // start a transition
    if (this.tuning.inertialization) this.inertializer.request(dur ?? this.tuning.blend);
  }
  _playOnly(name, blend) {
    this._blend(blend);
    for (const [k, s] of this._slots) s.w = 0;
    this._slots.set(name, { w: 1 });
    for (const [k, s] of [...this._slots]) if (s.w === 0 && k !== 'idle' && k !== 'loco') this._slots.delete(k);
  }
  _playOneShot(name, blend, startTime = 0, yawScale = 1, rate = 1) {
    const a = this.actions[name];
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveTimeScale(rate);
    this._osRate = rate;
    a.time = startTime; a.play();
    this._playOnly(name, blend);
    this.oneShot = name; this._osPrevT = startTime; this._osStart = startTime; this._yawScale = yawScale;
  }
  /** clip seconds played since the running one-shot was entered (equals stateTime at rate 1) */
  _osElapsed() { return this.oneShot ? this._osPrevT - (this._osStart ?? 0) : this.stateTime; }

  /** after spawning / being moved by the game: face `facing` at once (no turn clip), drop blends and foot locks */
  teleport(facing) {
    this.facing = facing; this._sYaw = undefined; this._targetYaw = undefined; this._lastMoveYaw = undefined;
    this.planarVel.set(0, 0, 0); this._travel = 0; this._blocked = 0;
    for (const k of [...this._slots.keys()]) this._slots.delete(k);
    this._slots.set('idle', { w: 1 }); this.oneShot = null;
    this.state = 'idle'; this.stateTime = 0;
    this.inertializer.active = false; this.inertializer.pending = false;
    this.footLock.reset(); this.groundAdapt.reset();
    this._lean = 0; this._crouchPrev = undefined; this.alt = false;
    this._wSnap = true;                                        // weapon stance: there at once, no equip clip
  }
  _applyWeights() {
    for (const e of this._acts.values()) e.a.setEffectiveWeight(0);
    const add = (n, w) => { if (w <= 1e-4) return; const a = this._act(n); if (a) { a.setEffectiveWeight(a.getEffectiveWeight() + w); this._acts.get(n).used = this.time; } };
    let total = 0; for (const s of this._slots.values()) total += s.w;
    const norm = total > 0 ? 1 / total : 0;
    for (const [k, s] of this._slots) {
      const w = s.w * norm; if (w <= 0) continue;
      if (k === 'idle') { add(this._idleStand || CLIP_MAP.idle.stand, w * (1 - this.crouchW)); add(CLIP_MAP.idle.crouch, w * this.crouchW); }
      else if (k === 'loco') for (const [n, lw] of this._locoWeights) add(n, w * lw);
      else add(k, w);
    }
    this.debugWeights = [...this._acts].map(([n, e]) => [n, e.a.getEffectiveWeight()]).filter(([, w]) => w > 0.01).sort((a, b) => b[1] - a[1]);
    if ((this._trimT = (this._trimT || 0) + (this._dtNow || 0)) > 2) { this._trimT = 0; this._trim(); }
  }

  _dirWeights(gait, theta, alt = this.alt) {
    const set = (alt ? this.loopSetsAlt : this.loopSets)[gait];
    if (!set || !set.length) return [];
    if (set.length === 1) return [[set[0], 1]];
    let lo = null, hi = null, dLo = -Infinity, dHi = Infinity;
    for (const s of set) {
      const d = wrapDeg(s.angle - theta);
      if (d <= 0 && d > dLo) { dLo = d; lo = s; }
      if (d >= 0 && d < dHi) { dHi = d; hi = s; }
    }
    if (!lo || !hi) return [[(lo || hi), 1]];
    const span = dHi - dLo;
    if (lo === hi || span <= 0) return [[lo, 1]];
    if (span > 180) return [[Math.abs(dLo) < Math.abs(dHi) ? lo : hi, 1]];
    const k = -dLo / span;
    return [[lo, 1 - k], [hi, k]];
  }
  _updateLoco(dt) {
    const list = []; let dur = 0, speed = 0;
    // calm start / rolling out: the gait follows the real speed (walk <-> run, in phase), like a blend space
    const calm = this._calmNow();
    if (calm && (!this._coast || this.tuning.coastMix)) {
      const gk = this._gaitKey(), v0 = this.speedAt(calm, this.locoTheta), v1 = this.speedAt(gk, this.locoTheta);
      const k = v1 > v0 + 0.1 ? clamp((this._realSpeed - v0) / (v1 - v0), 0, 1) : 1;
      for (const g of Object.keys(this.gaitW)) this.gaitW[g] = g === gk ? k : g === calm ? 1 - k : 0;
    }
    for (const [g, gw] of Object.entries(this.gaitW)) {
      if (gw <= 1e-3) continue;
      for (const [s, w] of this._dirWeights(g, this.locoTheta)) { list.push([s, w * gw]); dur += s.duration * w * gw; speed += s.speed * w * gw; }
    }
    // capsule-led: the loop plays as fast as the character really moves (feet do not slide when the game is slower / faster)
    // straight out of standing (calm start) the rate follows the capsule at once and from further down: the first step is as slow as the character
    const soft = !!calm;
    const want = this._realSpeed !== undefined && this.state === 'loop' && speed > 0.3 ? clamp(this._realSpeed / speed, soft ? 0.25 : 0.6, 1.3) : 1;
    this._locoRate = soft ? want : approach(this._locoRate ?? 1, want, 3 * dt);
    if (dur > 0) this.phase = (this.phase + dt * this._locoRate / dur) % 1;
    const m = new Map();
    for (const [s, w] of list) {
      const a = this.actions[s.name];
      a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveTimeScale(0);
      a.time = s.cyc ? s.cyc.a + ((this.phase + s.cyc.phi0) % 1) * (s.cyc.b - s.cyc.a) : this.phase * s.duration;
      m.set(s.name, (m.get(s.name) || 0) + w);
    }
    this._locoWeights = m; this.locoSpeed = speed;
    let best = null, bw = 0, bs = null; for (const [s, w] of list) if (w > bw) { bw = w; best = s.name; bs = s; }
    this._dominantLoop = best; this._dominantT = best ? this.actions[best].time : 0;
    // the seam of the dominant clip's cycle: its two ends fit to a few cm, the rest is blended away
    if (bs && bs.cyc && this.state === 'loop') {
      const u = (this.phase + bs.cyc.phi0) % 1;
      if (this._seamClip === best && u < this._seamU - 0.5) this._blend(this.tuning.seamBlend);
      this._seamU = u; this._seamClip = best;
    }
  }
  /** loop phase whose foot pose matches the current pose best */
  _matchLoopPhase(gait, theta) {
    const ws = this._dirWeights(gait, theta);
    if (!ws.length) return 0;
    const s = ws.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const f = this.feat[s.name];
    let bi = 0, bc = Infinity;
    const cy = s.cyc, i0 = cy ? cy.ia : 0, i1 = cy ? cy.ib : f.n;
    for (let i = i0; i < i1; i++) { const c = poseCost(f, i, this.curPose, { speed: 0 }); if (c < bc) { bc = c; bi = i; } }
    if (cy) return ((((f.ts[bi] - cy.a) / (cy.b - cy.a) - cy.phi0) % 1) + 1) % 1;
    return f.ts[bi] / f.duration;
  }

  // ------------------------------------------------------------------ candidate search ("motion matching light")
  /** candidates: [{name, extra}] ; window [t0,t1] (s) inside each clip ; returns {name, t, cost} */
  _search(cands, t0, t1, opts = {}) {
    let best = null;
    for (const { name, extra = 0 } of cands) {
      const f = this.feat[name]; if (!f) continue;
      const a = f.index(t0), b = f.index(Math.min(t1, f.duration));
      for (let i = a; i <= b; i++) {
        let c = extra + poseCost(f, i, this.curPose, opts.w);
        if (opts.maxSpeed !== undefined && f.speed[i] > opts.maxSpeed) c += 5;
        if (opts.footPref && f.firstLift && f.firstLift !== opts.footPref) c += opts.footPenalty ?? 0.3;
        if (opts.rem !== undefined) c += (opts.remW ?? 2) * ((f.cum[f.n - 1] - f.cum[i]) - opts.rem) ** 2;   // remaining root distance (stop by distance)
        if (opts.contacts) c += 0.4 * ((!!f.contactL[i] !== opts.contacts.l) + (!!f.contactR[i] !== opts.contacts.r));   // foot phase
        if (!best || c < best.cost) best = { name, t: f.ts[i], cost: c, i };
      }
    }
    return best;
  }
  _settleTime(f, from = 0, thr = 0.12) {
    let last = from;
    for (let i = f.index(from); i < f.n; i++) if (f.speed[i] > thr) last = f.ts[i];
    return Math.min(f.duration, last + 0.2);
  }
  /** when a stop may hand over to idle: the body stands AND both feet are down and stay down (the second foot has finished
   *  stepping in). Leaving earlier made that foot jump into the idle pose. New input interrupts the stop at any time anyway. */
  _stopExit(f, from = 0) {
    if (this.tuning.stopPlayOut === false) return this._settleTime(f, from);     // old behaviour (tests)
    const need = Math.round(0.35 * 30);
    for (let i = f.index(this._settleTime(f, from)); i < f.n; i++) {
      let ok = true;
      for (let j = i; j < Math.min(f.n, i + need) && ok; j++) ok = !!f.contactL[j] && !!f.contactR[j];
      if (ok) return Math.min(f.duration, f.ts[i] + 0.1);
    }
    return f.duration;
  }
  _yawSettle(f, from = 0) {
    let last = from;
    for (let i = Math.max(1, f.index(from)); i < f.n; i++) if (Math.abs(f.yaw[i] - f.yaw[i - 1]) * 30 * DEG > 8) last = f.ts[i];
    return Math.min(f.duration, last + 0.15);
  }
  _speedReached(f, frac, minT, gait) {
    const target = frac * this.speedOf(gait);
    for (let i = f.index(minT); i < f.n; i++) if (f.speed[i] >= target) return f.ts[i];
    return null;
  }
  _yawScaleFor(f, offset, wantDeg) {
    const remain = f.yawTotalDeg - f.yawAt(offset) * DEG;
    if (Math.abs(remain) < 5) return 1;
    return clamp(wantDeg / remain, ...this.tuning.yawScaleRange);
  }

  // ------------------------------------------------------------------ state machine
  _enter(state, clip = '') {
    this.log.push({ t: +this.time.toFixed(2), from: this.state, to: state, clip });
    this.state = state; this.stateTime = 0; this._coast = false;
    if (state === 'idle') { this._idleT = 0; this._nextBreak = undefined; }
  }
  /** calm start / rolling out: the slower gait whose loop is mixed in by real speed, or null */
  _calmNow() {
    const T = this.tuning, gk = this._gaitKey();
    if (this._realSpeed === undefined || this.state !== 'loop' || !T.calmGait || !T.calmGait[gk]) return null;
    return this._coast || (this._loopFromIdle && this.stateTime < 0.5) ? T.calmGait[gk] : null;
  }
  _gaitKey() { return this.crouch ? 'crouch' : this.gait; }
  /** the gait that is really being played (largest loop weight): a sprint stops as a sprint, even when its key is released together with the direction */
  _shownGait() { if (this.crouch) return 'crouch'; let g = this._gaitKey(), w = 0; for (const [k, v] of Object.entries(this.gaitW)) if (v > w) { w = v; g = k; } return g; }
  _startLoco(blend, fromIdle = false, matchPhase = true) {
    if (matchPhase) this.phase = this._matchLoopPhase(this._gaitKey(), this.locoTheta);
    this._playOnly('loco', blend); this.oneShot = null; this._loopFromIdle = fromIdle; this._enter('loop');
  }
  _startIdle(blend = 0.3) { this._playOnly('idle', blend); this.oneShot = null; this.alt = false; this._enter('idle'); }

  update(dt, input = {}) {
    if (!this.mixer) return { delta: new THREE.Vector3(), facing: 0, jumpImpulse: false };
    const T = this.tuning;
    this.time += dt; this.stateTime += dt; this._dtNow = dt;
    if (input.style && input.style !== this._style) this.setStyle(input.style);
    const vel = input.vel || null;                 // capsule-led: real planar velocity
    this._realSpeed = vel ? vel.length() : undefined;
    this._stopDist = vel ? input.stopDist : undefined;
    if (vel) this.planarVel.set(vel.x, 0, vel.y);
    const rawMv = input.moveDir || new THREE.Vector2();
    const moving = rawMv.length() > 0.1;          // pressing / releasing reacts immediately
    // direction smoothing (~0.05 s) so camera/key jitter does not trigger new turn clips all the time
    // (smoothed on the ANGLE - lerping vectors would never flip on a 180° reversal)
    if (!this._smv) this._smv = new THREE.Vector2();
    if (moving) {
      const rawYaw = Math.atan2(rawMv.x, rawMv.y);
      if (this._sYaw === undefined || this._smv.lengthSq() < 1e-6) this._sYaw = rawYaw;
      else this._sYaw = approachAngle(this._sYaw, rawYaw, Math.abs(wrapRad(rawYaw - this._sYaw)) * (1 - Math.exp(-dt / T.inputSmoothing)));
      this._smv.set(Math.sin(this._sYaw), Math.cos(this._sYaw));
    } else this._smv.set(0, 0);
    // camera facing is NOT low-passed: a smoothed target creeps over the 45° threshold and first picks a
    // too small turn clip, then re-selects (measured: more foot sliding). Jitter is handled by the
    // re-select hysteresis (reselectAngle) instead.
    const mv = moving ? this._smv : rawMv;
    const moveYaw = moving ? Math.atan2(mv.x, mv.y) : this.facing;
    if (moving) this._lastMoveYaw = moveYaw;
    this._movingNow = moving;
    this.crouch = !!input.crouch;
    const strafe = !!input.strafe;
    let gait = input.gait || 'run';
    const thetaIn = moving ? wrapDeg((this.facing - moveYaw) * DEG) : this.locoTheta;
    // the same from the unsmoothed input: a change of direction shows here in the very frame the keys change
    const rawTheta = moving ? wrapDeg((this.facing - Math.atan2(rawMv.x, rawMv.y)) * DEG) : this.locoTheta;
    if (gait === 'sprint' && strafe && Math.abs(thetaIn) > 60) gait = 'run';
    this.gait = gait;
    const gk = this._gaitKey();
    const out = { delta: new THREE.Vector3(), facing: this.facing, jumpImpulse: false };
    const targetFacing = strafe ? (input.facing ?? this.facing) : (moving ? moveYaw : this.facing);
    const facing0 = this.facing;
    this._thetaNow = moving ? thetaIn : null;                  // travel direction relative to the body (jumps), null = standing
    const grounded = input.grounded !== false;
    this.crouchW = approach(this.crouchW, this.crouch ? 1 : 0, dt / 0.3);
    for (const g of Object.keys(this.gaitW)) this.gaitW[g] = approach(this.gaitW[g], g === gk ? 1 : 0, dt / 0.25);
    this._strafe = strafe;

    // dead: fall over and stay down until the game says otherwise (then stand up at once, like after being moved)
    const dead = !!input.dead && this.deathClips.length > 0;
    if (dead && this.state !== 'dead') {
      const name = this.deathClips[Math.floor(Math.random() * this.deathClips.length)];
      const from = Math.min(T.deathStart, this.feat[name].duration - 0.3);
      this._playOneShot(name, 0.15, from, 0);
      this._deadFall = this.feat[name].duration - from - 0.05; this._deadLie = this.deathLie.get(name) || null;
      this._enter('dead', name);
    } else if (!dead && this.state === 'dead') this.teleport(this.facing);
    else if (dead && this._deadLie && this.stateTime >= this._deadFall) {
      // the fall is over: come to rest in the lying pose (held at its first frame)
      const a = this._act(this._deadLie);
      a.reset(); a.setEffectiveTimeScale(0); a.time = 0; a.play();
      this._playOnly(this._deadLie, T.deathSettle); this.oneShot = null; this._deadLie = null;
    }

    if (!dead && !grounded && (input.verticalSpeed ?? 0) < -2 && !['jumpStart', 'fall'].includes(this.state)) this._enterFall(0.25);
    // capsule-led: the game has already jumped when it reports the jump (first frame in the air) - start the clip at its take-off
    if (!dead && input.jump && (grounded || vel) && !this.crouch && !['jumpStart', 'fall', 'land'].includes(this.state)) this._enterJump(!!vel);

    // v3: every state can be interrupted. Turning clips are re-targeted every frame (root rotation scaled
    // to the CURRENT target), and re-selected (pose matching) when the target jumps by > reselectAngle.
    const desiredYaw = strafe ? targetFacing : moveYaw;        // where body / movement should go now
    const canReselect = this.stateTime >= T.minClipTime;
    const jumpTarget = this._targetYaw !== undefined && Math.abs(wrapDeg((desiredYaw - this._targetYaw) * DEG)) > T.reselectAngle;

    // v4: capsule-led strafe locomotion is motion matched
    const startMove = () => this._enterStart(thetaIn, strafe, moveYaw);

    switch (this.state) {
      case 'idle': {
        if (moving) { startMove(); break; }
        if (this._crouchPrev !== undefined && this.crouch !== this._crouchPrev && this._enterStance()) break;
        const diff = wrapDeg((targetFacing - this.facing) * DEG);
        if (strafe && Math.abs(diff) > T.turnThreshold) {
          if (!this._enterTurn(diff, false)) this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt);
          break;
        }
        this._idleT = (this._idleT || 0) + dt;
        if (this._nextBreak === undefined) this._nextBreak = T.idleBreakEvery[0] + Math.random() * (T.idleBreakEvery[1] - T.idleBreakEvery[0]);
        if (T.idleBreaks && this._idleT > this._nextBreak && this.crouchW === (this.crouch ? 1 : 0)) this._enterBreak();
        break;
      }
      case 'break': case 'stance': {
        // both stand on the spot and give way to anything else at once
        if (moving) { startMove(); break; }
        if (this.crouch !== this._crouchPrev) { if (!this._enterStance()) this._startIdle(0.3); break; }
        const diff = wrapDeg((targetFacing - this.facing) * DEG);
        if (strafe && Math.abs(diff) > T.turnThreshold) {
          if (!this._enterTurn(diff, false)) { this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt); this._startIdle(0.3); }
          break;
        }
        if (this.stateTime >= this._exitT) this._startIdle(this.state === 'stance' ? 0.3 : 0.45);
        break;
      }
      case 'turn': {
        if (moving) { startMove(); break; }
        const want = strafe ? wrapDeg((targetFacing - this.facing) * DEG) : 0;
        if (strafe && canReselect && jumpTarget) {                 // target jumped: new turn clip from the current pose
          if (Math.abs(want) > T.turnThreshold && this._enterTurn(want, true)) break;
          this._startIdle(T.blend); break;
        }
        // small target changes: re-scale the remaining clip rotation (only when the target really moved,
        // a constant per-frame re-scale made the feet slide)
        if (strafe && Math.abs(wrapDeg((desiredYaw - this._targetYaw) * DEG)) > 3) { this._retargetYaw(want, false); this._targetYaw = desiredYaw; }
        // let the clip finish its steps (feet) - new input interrupts it at any time anyway
        if (this.stateTime >= this._exitT) this._startIdle(0.25);
        break;
      }
      case 'start': {
        const f = this.feat[this.oneShot];
        const turning = Math.abs(f.yawTotalDeg) > 20;
        if (!moving) {
          if (this.stateTime < T.tapTime || this.planarVel.length() < T.tapSpeed) this._enterSettle(); else this._enterStop();
          break;
        }
        if (!strafe && turning) this._retargetYaw(wrapDeg((moveYaw - this.facing) * DEG));
        else if (!strafe) this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt);
        const dirChanged = canReselect && (strafe ? Math.abs(wrapDeg(thetaIn - this._startTheta)) > T.reselectAngle : jumpTarget);
        const upToSpeed = vel && this.stateTime > 0.2 && this._realSpeed >= 0.92 * this.speedOf(gk) && this._osElapsed() > 0.25;
        if (this._osElapsed() >= this._exitT || upToSpeed || dirChanged || gk !== this._startGait) {
          if (!strafe && dirChanged && Math.abs(wrapDeg((moveYaw - this.facing) * DEG)) > T.movingTurnThreshold && this._enterMovingTurn(wrapDeg((moveYaw - this.facing) * DEG))) break;
          this.locoTheta = strafe ? thetaIn : wrapDeg((this.facing - moveYaw) * DEG); this._startLoco(T.blend);
        }
        break;
      }
      case 'loop': {
        if (!moving) {
          if (this._loopFromIdle && this.stateTime < T.tapTime) this._enterSettle();
          // calm stop: roll out in the loop at the real speed (feet stay on the ground they cover), step in once slow
          else if (vel && strafe && T.calmGait && T.calmGait[gk] && (this._coast || this._shownGait() === gk) && this._realSpeed > T.coastSpeed) {
            this._coast = true; this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt);
          } else this._enterStop(this._coast ? gk : this._shownGait());
          break;
        }
        this._coast = false;
        if (!strafe) {
          const need = wrapDeg((moveYaw - this.facing) * DEG);
          if (Math.abs(need) > T.movingTurnThreshold && canReselect && this._enterMovingTurn(need)) break;
          // no fitting clip / small change: fast procedural rotation (feet keep up via the loop blend)
          const rate = Math.abs(need) > 30 ? T.proceduralTurnRate : this.turnRate[gk];
          this.facing = approachAngle(this.facing, targetFacing, rate * RAD * dt);
          // body turns fast; movement may deviate at most 45° from the body (tight arc instead of moonwalking backwards)
          this.locoTheta = approach(this.locoTheta, clamp(wrapDeg((this.facing - moveYaw) * DEG), -45, 45), 540 * dt);
        } else {
          this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt);
          const d = wrapDeg(thetaIn - this.locoTheta);
          // Direction change: a planted step. Triggered by the raw input – the smoothed direction creeps round and the loop
          // sweeps after it, so their difference never got large (the old test `d > 120` practically never fired).
          if (vel ? Math.abs(wrapDeg(rawTheta - this.locoTheta)) > T.pivotAngle && canReselect && this._enterPivot(rawTheta)
            : Math.abs(d) > 120 && canReselect && this._enterPivot(thetaIn)) break;
          this.locoTheta = wrapDeg(this.locoTheta + clamp(d, -720 * dt, 720 * dt));
          if (this.alt && Math.abs(Math.abs(this.locoTheta) - 90) > 50) this.alt = false;   // no longer sideways: the second stance is over
        }
        this._targetYaw = desiredYaw;
        break;
      }
      case 'movingTurn': {
        if (!moving) { this._enterStop(); break; }
        const need = wrapDeg((moveYaw - this.facing) * DEG);
        if (canReselect && jumpTarget) {                           // direction changed again mid-turn
          if (Math.abs(need) > T.movingTurnThreshold && this._enterMovingTurn(need)) break;
          this.locoTheta = wrapDeg((this.facing - moveYaw) * DEG); this._startLoco(T.blend); break;
        }
        this._retargetYaw(need);
        // done as soon as the body points (almost) the right way - don't wait for the clip's end
        if (this.stateTime >= this._exitT || (canReselect && Math.abs(need) < 15)) { this.locoTheta = wrapDeg((this.facing - moveYaw) * DEG); this._startLoco(T.blend); }
        break;
      }
      case 'pivot': {
        if (!moving) { this._enterStop(); break; }
        const off = Math.abs(wrapDeg((this._pivot ? rawTheta : thetaIn) - this._pivotTheta));
        if (canReselect && off > T.reselectAngle) {   // changed mind during the pivot
          // another large change: the next planted step, from the direction this one was heading for
          if (this._pivot && off > T.pivotAngle) { this.locoTheta = this._pivotTheta; if (this._enterPivot(rawTheta)) break; }
          this.locoTheta = thetaIn; this._startLoco(T.blend); break;
        }
        if (strafe) this.facing = approachAngle(this.facing, targetFacing, T.proceduralTurnRate * RAD * dt);
        if (this._pivot ? this._osPrevT >= this._pivot.ti.t1 + T.pivotTail : this.stateTime >= this._exitT) {
          if (this._pivot && this._pivot.ti.altTo !== null) this.alt = this._pivot.ti.altTo;      // the stance the clip ends in
          this.locoTheta = thetaIn; this._startLoco(T.blend);
        }
        break;
      }
      case 'stop': {
        if (moving) {
          if (this.planarVel.length() > T.resumeLoopSpeed) { this.locoTheta = strafe ? thetaIn : wrapDeg((this.facing - moveYaw) * DEG); this._startLoco(T.blend); }
          else this._enterStart(thetaIn, strafe, moveYaw);
          break;
        }
        if (this._osElapsed() >= this._exitT) this._startIdle(0.3);
        break;
      }
      case 'settle': {
        if (moving) { startMove(); break; }
        if (!strafe && this._lastMoveYaw !== undefined) this.facing = approachAngle(this.facing, this._lastMoveYaw, this.turnRate[gk] * 1.5 * RAD * dt);
        if (this.stateTime >= T.tapBlend) { this.oneShot = null; this._enter('idle'); }
        break;
      }
      case 'jumpStart': {
        if (!this._impulseDone && this.stateTime >= this._takeoffIn) { out.jumpImpulse = true; this._impulseDone = true; }
        if (this._impulseDone && this.stateTime > this._takeoffIn + 0.15 && (input.verticalSpeed ?? 0) < -0.5) this._enterFall(0.3);
        else if (this._impulseDone && this.stateTime > this._takeoffIn + 0.15 && grounded) this._enterLand();
        break;
      }
      case 'fall': { if (grounded) this._enterLand(); break; }
      case 'land': {
        if (this.stateTime >= this._exitT || (moving && this.stateTime > 0.12)) {
          if (moving) { this.locoTheta = strafe ? thetaIn : 0; this._startLoco(0.3); } else this._startIdle(0.3);
        }
        break;
      }
    }
    if (input.verticalSpeed !== undefined && !grounded) this._lastVy = input.verticalSpeed;

    // ---- capsule-led: starts and stops are played by distance (the clip is where the capsule is)
    const st = this.state;
    if (vel && this.oneShot && (st === 'start' || st === 'stop') && dt > 0) {
      const f = this.feat[this.oneShot], a = this.actions[this.oneShot], t0 = this._osPrevT;
      let t1 = t0 + dt;
      if (st === 'start') {
        this._travel = (this._travel ?? 0) + this._realSpeed * dt;
        t1 = f.timeAtCum(this._travelFrom + this._travel);
        // the first steps of a start hardly travel: never slower than real time there, never more than 3x
        t1 = clamp(t1, t0 + dt * (f.speed[f.index(t0)] < 1 ? 1 : 0.6), t0 + dt * 3);
      } else if (this._stopDist !== undefined) {
        // remaining clip distance = remaining capsule distance; once the capsule stands the clip settles in real time
        const total = f.cum[f.n - 1];
        t1 = this._realSpeed < 0.15 ? t0 + dt * 1.15 : f.timeAtCum(total - Math.min(total, this._stopDist));
        t1 = clamp(t1, t0 + dt * 0.5, t0 + dt * 3);
      }
      t1 = Math.min(t1, f.duration);
      this._osRate = (t1 - t0) / dt;
      a.setEffectiveTimeScale(this._osRate);
    }

    // ---- capsule-led: a direction change is played by VELOCITY – the clip is as far through its change as the capsule is
    if (vel && this.oneShot && st === 'pivot' && this._pivot && dt > 0) {
      const P = this._pivot, f = this.feat[this.oneShot], a = this.actions[this.oneShot], t0 = this._osPrevT;
      const sF = Math.sin(this.facing), cF = Math.cos(this.facing);
      const vf = vel.x * sF + vel.y * cF, vr = -(vel.x * cF - vel.y * sF);              // forward, right
      const dx = P.b[0] - P.a[0], dy = P.b[1] - P.a[1], dl = dx * dx + dy * dy;
      const p = dl > 0.01 ? clamp(((vf - P.a[0]) * dx + (vr - P.a[1]) * dy) / dl, 0, 1) : 1;
      const x = p * 20, k = Math.min(19, Math.floor(x)), want = P.ti.tAt[k] + (P.ti.tAt[k + 1] - P.ti.tAt[k]) * (x - k);
      let t1 = p > 0.97 ? t0 + dt : clamp(want, t0 + dt * T.pivotRate[0], t0 + dt * T.pivotRate[1]);
      t1 = Math.min(t1, f.duration);
      this._osRate = (t1 - t0) / dt;
      a.setEffectiveTimeScale(this._osRate);
    }

    // ---- movement
    if (st === 'loop') {
      this._updateLoco(dt);
      const yaw = this.facing - this.locoTheta * RAD;
      out.delta.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(this.locoSpeed * (this._locoRate ?? 1) * dt);
    } else if (['start', 'stop', 'pivot', 'turn', 'settle', 'movingTurn'].includes(st) && this.oneShot) {
      const a = this.actions[this.oneShot], f = this.feat[this.oneShot];
      const t0 = this._osPrevT, t1 = Math.min(t0 + dt * (this._osRate || 1), f.duration);
      // root motion delta of the clip, in the clip's current root frame, applied with the current facing
      const d = f.posAt(t1).sub(f.posAt(t0)); d.y = 0;
      d.applyAxisAngle(UP, -f.yawAt(t1));
      if (st === 'settle') d.multiplyScalar(Math.max(0, 1 - this.stateTime / T.tapBlend));
      const dYaw = (f.yawAt(t1) - f.yawAt(t0)) * this._yawScale;
      if (st !== 'settle' || true) this.facing += dYaw;
      out.delta.copy(d).applyAxisAngle(UP, this.facing);
      this._osPrevT = t1;
    } else if (st === 'settle') {
      out.delta.copy(this._settleVel).multiplyScalar(dt * Math.max(0, 1 - this.stateTime / T.tapBlend));
    } else if (st === 'jumpStart' || st === 'fall' || st === 'land') {
      const steer = moving ? new THREE.Vector3(mv.x, 0, mv.y).normalize().multiplyScalar(Math.max(this.planarVel.length(), 1.5)) : this.planarVel.clone();
      this.planarVel.lerp(steer, Math.min(1, dt * (st === 'land' ? 4 : 1.2)));
      if ((st === 'land' || (st === 'jumpStart' && !this._impulseDone)) && !moving) this.planarVel.multiplyScalar(Math.max(0, 1 - dt * 8));
      if (moving) this.facing = approachAngle(this.facing, strafe ? targetFacing : moveYaw, 200 * RAD * dt);
      out.delta.copy(this.planarVel).multiplyScalar(dt);
    }
    if (st !== 'loop' && this._slots.has('loco')) this._updateLoco(dt);
    if (vel) this.planarVel.set(vel.x, 0, vel.y);
    else if (!['jumpStart', 'fall', 'land'].includes(st) && dt > 0) this.planarVel.copy(out.delta).multiplyScalar(1 / dt);
    this.facing = wrapRad(this.facing);
    out.facing = this.facing;
    (this.rootDelta || (this.rootDelta = new THREE.Vector3())).copy(out.delta);   // what the clips moved this frame (tests: compare with the capsule)
    this._applyWeights();
    this.inertializer.restorePure();      // drop last frame's offsets/IK before the mixer writes (see Inertializer)
    this.mixer.update(dt);
    this.inertializer.savePure();
    this._applyLayers(dt, input, strafe ? wrapDeg((targetFacing - this.facing) * DEG) : 0, dt > 0 ? wrapRad(this.facing - facing0) / dt : 0);
    this.inertializer.apply(dt);
    this._crouchPrev = this.crouch;
    this._dt = dt;
    return out;
  }

  /**
   * poses on top of the animation (PoseLayers.js): head and chest follow the view, the body leans into the curve.
   * yawOff: how far the view is to the LEFT of the body (deg) · turnRate: rad/s the body turned this frame (+ = left)
   */
  _applyLayers(dt, input, yawOff, turnRate) {
    const L = this.layers, T = this.tuning;
    const st = this.state, air = st === 'fall' || st === 'jumpStart' || st === 'land';
    const k = (tau) => (dt > 0 ? 1 - Math.exp(-dt / tau) : 0);
    if (st === 'dead') input = {};                             // no look, no lean, no weapon stance
    // look: the view angles are low-passed; in the air and in a sprint the layer is weaker
    const lk = this._look, pitch = ((input.look && input.look.pitch) || 0) * DEG * T.lookPitch;
    const wantW = T.lookLayer && input.look ? (air ? 0.4 : 1 - (1 - T.lookSprint) * (this.gaitW.sprint || 0)) : 0;
    lk.yaw += (clamp(-yawOff, -135, 135) - lk.yaw) * k(T.lookSmooth);
    lk.pitch += (clamp(pitch, -90, 90) - lk.pitch) * k(T.lookSmooth);
    lk.w += (wantW - lk.w) * k(0.2);
    // weapon in hand: the upper body comes from the weapon stances (WeaponLayer.js), applied after the look layer and replacing it
    // there. Standing, the chest keeps the stance whatever the hips do (mesh space); running it follows them a little, in a sprint
    // and in the air mostly – the weapon moves with the body instead of floating in front of it.
    const Wp = this.weapon && this.weapon.ready ? this.weapon : null, wi = input.weapon || null;
    if (Wp) {
      const still = st === 'idle' || st === 'turn' || st === 'break' || st === 'stance' || st === 'settle';
      const want = air ? 0.45 : still ? 1 : 0.8 - 0.55 * (this.gaitW.sprint || 0);
      this._ms = this._wSnap ? want : this._ms + (want - this._ms) * k(0.15);
    }
    if (!L || !L.ready) { if (Wp) this._applyWeapon(dt, wi, lk); return; }
    // lean: sideways acceleration of the path = speed × turn rate, only while running forwards in the loop
    let want = 0;
    if (T.leanLayer && st === 'loop' && !this.crouch && this._realSpeed !== undefined) {
      const fwd = Math.max(0, Math.cos(this.locoTheta * RAD));
      want = clamp(this._realSpeed * turnRate / T.leanAccel, -1, 1) * T.leanMax * fwd * clamp((this._realSpeed - 2) / 2, 0, 1);
    }
    this._lean += (want - this._lean) * k(T.leanSmooth);
    L.apply({ yaw: lk.yaw, pitch: lk.pitch, lookW: lk.w, crouchW: this.crouchW, lean: this._lean, sprintW: this.gaitW.sprint || 0 });
    if (Wp) this._applyWeapon(dt, wi, lk);
  }

  /** wi: { kind, aim, shots, hits, reload } or null (no weapon). wi.hand false: not in the hand; with wi.body it is carried on the body then (wi.hide: unseen) */
  _applyWeapon(dt, wi, lk) {
    const sprint = this.gaitW.sprint || 0, T = this.tuning;
    this.weapon.apply(dt, {
      armed: !!wi && wi.hand !== false, body: !!(wi && wi.body), hide: !!(wi && wi.hide), kind: wi ? wi.kind : undefined, aim: !!(wi && wi.aim) && sprint < 0.5, shots: wi ? wi.shots : undefined, hits: wi ? wi.hits : undefined, toss: wi ? wi.toss : undefined,
      reload: wi && wi.reload !== undefined ? wi.reload : -1, crouchW: this.crouchW, yaw: lk.yaw, pitch: lk.pitch / (T.lookPitch || 1), ms: this._ms, snap: this._wSnap,
      move: clamp(((this._realSpeed ?? this.planarVel.length()) - 0.7) / 1.1, 0, 1) * (['fall', 'jumpStart', 'land'].includes(this.state) ? 0 : 1), sprint, fp: !!this.fpView, late: !!this.lateAdd,
    });
    this._wSnap = false;
  }

  /** call after the model's world transform for this frame is set: pose features + foot locking */
  finalize(dt = this._dt || 0, env = null) {
    this._capturePose(dt);
    if (this.state === 'dead') { this.groundAdapt.reset(); this.footLock.reset(); return; }   // lying: no foot IK
    const air = ['fall'].includes(this.state) || (this.state === 'jumpStart' && this._impulseDone);
    // feet follow the ground under them (slopes, steps) – before locking, so a locked foot keeps its adapted height
    if (env && env.ground) this.groundAdapt.update(dt, env.ground, env.baseY ?? 0, env.space || null, !air);
    else this.groundAdapt.reset();
    if (this.tuning.footLock) {
      const hard = ['idle', 'turn', 'settle', 'break', 'stance'].includes(this.state);   // hard lock while standing/turning, soft while moving
      this.footLock.update(dt, this._contactsNow(), !air, hard ? 0 : 3, hard ? 0.3 : 0.15, env ? env.space || null : null);
    }
    if (this.weapon) this.weapon.finalize();                   // left hand onto the weapon
  }

  /** re-target the running turning clip: scale its remaining root rotation to wantDeg (relative to now);
   *  when the clip has no rotation left, turn procedurally */
  _retargetYaw(wantDeg, procedural = true) {
    const f = this.feat[this.oneShot]; if (!f) return;
    const remain = f.yawTotalDeg - f.yawAt(this._osPrevT) * DEG;
    if (Math.abs(remain) > 8 && Math.sign(remain) === Math.sign(wantDeg)) {
      this._yawScale = clamp(wantDeg / remain, 0.3, 2.5);
    } else if (procedural) {
      this._yawScale = 0;
      this.facing += clamp(wantDeg * RAD, -this.tuning.proceduralTurnRate * RAD * this._dtNow, this.tuning.proceduralTurnRate * RAD * this._dtNow);
    }
  }
  /** which foot carries the weight right now (model space: the lower one) */
  _supportContacts() {
    const c = this.curPose;
    return { l: c.footL.y <= c.footR.y + 0.03, r: c.footR.y <= c.footL.y + 0.03 };
  }

  _contactsNow() {
    const st = this.state;
    if (st === 'idle' || st === 'break' || st === 'stance') return { l: true, r: true };
    // loops: feet are already planted by the speed-matched movement; locking there fights the
    // procedural turning, so only one-shots (start/stop/turn/pivot/settle) and idle are locked
    if (st === 'loop') return { l: false, r: false };
    // a calm stop (stop of the slower gait) locks its support foot: it comes out of a wider stride than the clip's own
    if (!this.tuning.footLockStates.includes(st) && !(st === 'stop' && this._calmStop)) return { l: false, r: false };
    if (this.oneShot && this.feat[this.oneShot]) {
      const f = this.feat[this.oneShot], i = f.index(this.actions[this.oneShot].time);
      const c = { l: !!f.contactL[i], r: !!f.contactR[i] };
      // while moving (start/stop/pivot/moving turn) only the support foot is locked
      if (c.l && c.r && ['start', 'stop', 'pivot', 'movingTurn'].includes(st)) {
        const s = this._supportContacts(); if (s.l && !s.r) c.r = false; else if (s.r && !s.l) c.l = false;
      }
      return c;
    }
    return { l: false, r: false };
  }

  // ------------------------------------------------------------------ transitions into states
  _footPref(theta) {
    if (Math.abs(theta) > 60) return theta < 0 ? 'L' : 'R';               // sideways: leading foot first
    const c = this.curPose, fwd = Math.abs(theta) < 90 ? 1 : -1;          // forward/back: rear foot first
    return (c.footL.z * fwd < c.footR.z * fwd) ? 'L' : 'R';
  }

  _enterStart(theta, strafe, moveYaw) {
    const gk = this._gaitKey(), T = this.tuning;
    // calm start (capsule-led): the Run starts of the clip set are sprint starts in all but name (trunk 59° forward, hips 20 cm
    // down) and the game is at full speed after 0.25 s – the dive flashed up and was gone. Straight into the loop instead, at the
    // phase that fits the standing pose; the loop then plays as fast as the character really moves.
    if (strafe && this._realSpeed !== undefined && T.calmGait && T.calmGait[gk]) {
      // the phase is matched in the slower gait (its loop is the one that shows first; the gaits run in phase)
      this.locoTheta = theta; this.phase = this._matchLoopPhase(T.calmGait[gk], theta);
      this._startLoco(T.softStartBlend, true, false); return;
    }
    const need = strafe ? 0 : wrapDeg((moveYaw - this.facing) * DEG);   // + = turn left
    const want = strafe ? theta : 0;                                      // travel dir relative to (final) facing
    const cands = [];
    for (const name of this.groups.starts[gk] || []) {
      const f = this.feat[name];
      const yawErr = Math.abs(wrapDeg(f.yawTotalDeg - need));
      const turning = Math.abs(f.yawTotalDeg) > 20;
      const dir = turning ? (f.endDirDeg ?? f.dirDeg) : (f.startDirDeg ?? f.dirDeg);
      const dirErr = Math.abs(wrapDeg(dir - want));
      if (strafe && turning) continue;
      if (!strafe && !turning && Math.abs(need) > 45) {     // non-turning start: body must rotate procedurally
        cands.push({ name, extra: Math.abs(need) / 45 + dirErr / 30 }); continue;
      }
      if (yawErr > 50 || dirErr > 40) continue;
      cands.push({ name, extra: yawErr / 30 + dirErr / 30 });
    }
    const best = this._search(cands, 0, 0.15, { footPref: this._footPref(theta), w: { speed: 0.05 } });
    if (!best) { this.locoTheta = strafe ? theta : 0; this._startLoco(0.2, true); return; }
    const f = this.feat[best.name];
    const turning = Math.abs(f.yawTotalDeg) > 20;
    this._playOneShot(best.name, T.blend, best.t, turning ? this._yawScaleFor(f, best.t, need) : 0);
    const minT = Math.max(best.t + 0.3, turning ? this._yawSettle(f, best.t) : 0);
    this._exitT = Math.min(this._speedReached(f, 0.9, minT, gk) ?? f.duration * 0.6, f.duration - 0.3) - best.t;
    this._startTheta = want; this._startGait = gk; this._startYaw = moveYaw;
    this._travel = 0; this._travelFrom = f.cumAt(best.t);
    this._targetYaw = strafe ? this.facing : moveYaw;
    this._enter('start', best.name + (best.t > 0 ? ` @${best.t.toFixed(2)}` : '') + (turning ? ` yaw x${this._yawScale.toFixed(2)}` : ''));
  }

  _enterStop(gait) {
    const gk = gait || this._gaitKey(), T = this.tuning;
    const theta = this.state === 'loop' ? this.locoTheta : (this._startTheta ?? 0);
    const cur = this.planarVel.length();
    if (cur < 0.5) { this._enterSettle(); return; }
    // calm stop (capsule-led): the Run stops brake like a sprint (hips down to 70 cm); the Walk stops step in upright
    const sg = (this._stopDist !== undefined && T.calmGait && T.calmGait[gk]) || gk;
    const cands = (this.groups.stops[sg] || this.groups.stops.run).map((name) => {
      const f = this.feat[name]; const d = f.startDirDeg ?? f.dirDeg;
      return { name, extra: Math.abs(wrapDeg(d - theta)) / 40, f };
    }).filter((c) => c.extra < 1.5);
    // entry by FOOT PHASE (which foot is planted, where the feet are) first, speed second
    // entry by FOOT PHASE; capsule-led also by remaining distance (the clip must end where the capsule will stand)
    const led = this._stopDist !== undefined;
    const best = this._search(cands, 0, led ? 9 : 1.5, { w: { pos: 1.5, speed: 0.15 }, maxSpeed: cur + 0.8, contacts: this._supportContacts(), rem: led ? this._stopDist : undefined });
    if (!best) { this._startIdle(0.3); return; }
    const f = this.feat[best.name];
    const settle = this._settleTime(f, best.t);
    if (settle - best.t < 0.15) { this._enterSettle(); return; }
    this._playOneShot(best.name, sg !== gk ? T.softStopBlend : T.stopBlend, best.t, 1);
    this._calmStop = sg !== gk;
    this._exitT = this._stopExit(f, best.t) - best.t;
    this._enter('stop', `${best.name} @${best.t.toFixed(2)}`);
  }

  _enterSettle() {
    this._settleVel = this.planarVel.clone();
    if (this.state === 'loop') this.oneShot = null;
    const keep = this.oneShot;
    this._playOnly('idle', this.tuning.tapBlend);
    if (keep) { this._slots.set(keep, { w: 0.0001 }); this.oneShot = keep; }   // keep its time running for root motion
    this._enter('settle', keep || '');
  }

  _enterTurn(diffDeg, chained) {
    const set = this.groups.turnInPlace[this.crouch ? 'crouch' : 'stand'] || [];
    const cands = set.filter((n) => Math.sign(this.feat[n].yawTotalDeg) === Math.sign(diffDeg))
      .map((name) => ({ name, extra: Math.abs(this.feat[name].yawTotalDeg - diffDeg) / 30 }));
    const best = this._search(cands, 0, chained ? 1.0 : 0.1, { w: { speed: 0 } });
    if (!best || best.cost > this.tuning.maxCost) return false;
    const f = this.feat[best.name];
    this._playOneShot(best.name, chained ? 0.15 : this.tuning.blend, best.t, this._yawScaleFor(f, best.t, diffDeg), this.tuning.turnPlaybackRate);
    this._exitT = (this._yawSettle(f, best.t) - best.t) / this.tuning.turnPlaybackRate;
    this._targetYaw = this.facing + diffDeg * RAD;
    this._enter('turn', `${best.name}${best.t > 0 ? ' @' + best.t.toFixed(2) : ''} target ${diffDeg.toFixed(0)}deg x${this._yawScale.toFixed(2)}`);
    return true;
  }

  _enterMovingTurn(needDeg) {
    const gk = this._gaitKey();
    const cands = (this.groups.movingTurns[gk] || []).filter((n) => Math.sign(this.feat[n].yawTotalDeg) === Math.sign(needDeg))
      .map((name) => ({ name, extra: Math.abs(this.feat[name].yawTotalDeg - needDeg) / 30 }));
    const best = this._search(cands, 0, 0.4, { w: { speed: 0.3 }, contacts: this._supportContacts() });
    if (!best || best.cost > this.tuning.maxCost) return false;
    const f = this.feat[best.name];
    this._playOneShot(best.name, this.tuning.moveBlend, best.t, this._yawScaleFor(f, best.t, needDeg), this.tuning.turnPlaybackRate);
    const yawDone = this._yawSettle(f, best.t);
    this._exitT = Math.min(Math.max(yawDone, this._speedReached(f, 0.85, yawDone, gk) ?? yawDone), f.duration - 0.25) - best.t; this._exitT /= this.tuning.turnPlaybackRate;
    this._targetYaw = this.facing + needDeg * RAD;
    this._enter('movingTurn', `${best.name} @${best.t.toFixed(2)} need ${needDeg.toFixed(0)}deg x${this._yawScale.toFixed(2)}`);
    return true;
  }

  _enterPivot(theta) {
    const gk = this._gaitKey(), T = this.tuning;
    if (this._realSpeed !== undefined) return this._enterPivotLed(theta, gk);
    this._pivot = null;
    const cands = [];
    for (const name of this.groups.pivots[gk] || []) {
      const f = this.feat[name];
      const e0 = Math.abs(wrapDeg((f.startDirDeg ?? 0) - this.locoTheta)), e1 = Math.abs(wrapDeg((f.endDirDeg ?? 0) - theta));
      if (e0 < 60 && e1 < 60) cands.push({ name, extra: (e0 + e1) / 40 });
    }
    const best = this._search(cands, 0, 0.6, { w: { speed: 0.3 } });
    if (!best) { this.locoTheta = theta; return false; }
    const f = this.feat[best.name];
    let iMin = best.i; for (let i = best.i; i < f.n && f.ts[i] < f.duration * 0.7; i++) if (f.speed[i] < f.speed[iMin]) iMin = i;
    this._playOneShot(best.name, this.tuning.moveBlend, best.t, 1, this.tuning.turnPlaybackRate);
    this._exitT = (Math.min(this._speedReached(f, 0.8, f.ts[iMin], gk) ?? f.duration * 0.6, f.duration - 0.3) - best.t) / this.tuning.turnPlaybackRate;
    this._pivotTheta = theta; this._targetYaw = this._strafeTarget ?? this.facing;
    this._enter('pivot', `${best.name} @${best.t.toFixed(2)}`);
    return true;
  }

  /** an idle break: one of the break clips of the stance, never the same twice in a row */
  _enterBreak() {
    const list = (this.groups.idleBreaks[this.crouch ? 'crouch' : 'stand'] || []).filter((n) => n !== this._lastBreak);
    if (!list.length) { this._idleT = 0; this._nextBreak = undefined; return false; }
    const name = list[Math.floor(Math.random() * list.length)];
    this._lastBreak = name;
    this._playOneShot(name, 0.45, 0, 0);
    this._exitT = this.feat[name].duration - 0.5;
    this._enter('break', name);
    return true;
  }
  /** crouch down / get up on the spot with the transition clip */
  _enterStance() {
    const name = this.tuning.stanceClips ? CLIP_MAP.stance && CLIP_MAP.stance[this.crouch ? 'crouch' : 'stand'] : null;
    if (!name || !this._has(name)) return false;
    // turned round halfway: start as far into the clip as the other one had come
    const back = this.state === 'stance' ? clamp(this.tuning.stanceExit - this.stateTime, 0, this.tuning.stanceExit - 0.2) : 0;
    this._playOneShot(name, 0.2, back, 0);
    this._exitT = this.tuning.stanceExit - back;
    this._enter('stance', name);
    return true;
  }

  /** direction of a jump / landing for a travel direction relative to the body (deg, + = right): F, B, LL (left), RL (right) */
  _jumpDir(theta) {
    if (!this.tuning.dirJumps || !this._strafe || theta === null || theta === undefined || Math.abs(theta) <= 50) return 'F';
    return Math.abs(theta) >= 130 ? 'B' : theta > 0 ? 'RL' : 'LL';
  }
  /** of the clips `names` the one whose feet fit the current pose at its time at(f) – foot variants (Lfoot / Rfoot) of one jump */
  _bestByPose(names, at, agree) {
    let best = null, ref = null;
    for (const name of names) {
      if (!this._has(name)) continue;
      const f = this.feat[name], t = at(f);
      if (ref === null) ref = agree(f);
      else if (Math.abs(agree(f) - ref) > 0.12) continue;      // the measured take-off / landing of this variant is off: leave it out
      const c = poseCost(f, f.index(t), this.curPose, { speed: 0 });
      if (!best || c < best.c) best = { name, c };
    }
    return best ? best.name : null;
  }

  /**
   * Direction change while the game moves the character: the clip that leads from the old travel direction into the new one, entered
   * just before its change at the frame whose feet fit (that also picks the Lfoot / Rfoot variant), then played by velocity (update).
   */
  _enterPivotLed(theta, gk) {
    const T = this.tuning;
    let best = null;
    for (const name of this.groups.pivots[gk] || []) {
      const f = this.feat[name], ti = this.turn[name];
      if (!ti) continue;
      const e0 = Math.abs(wrapDeg((f.startDirDeg ?? 0) - this.locoTheta)), e1 = Math.abs(wrapDeg((f.endDirDeg ?? 0) - theta));
      if (e0 > T.pivotDirTol || e1 > T.pivotDirTol) continue;
      if (ti.altFrom !== null && ti.altFrom !== this.alt) continue;      // starts sideways in the other stance
      const a = f.index(Math.max(0, ti.t0 - T.pivotLead)), b = f.index(ti.t0 + 0.02);
      for (let i = a; i <= b; i++) {
        const c = (e0 + e1) / 40 + (ti.altTo ? T.pivotAltCost : 0) + poseCost(f, i, this.curPose, { speed: 0.05 });
        if (!best || c < best.cost) best = { name, t: f.ts[i], cost: c, ti };
      }
    }
    if (!best || best.cost > T.maxCost) return false;          // no clip for this change: the loops sweep round as before
    const a0 = this.locoTheta * RAD, a1 = theta * RAD, v1 = this.speedAt(gk, theta) || this._realSpeed;
    this._pivot = { ti: best.ti, a: [Math.cos(a0) * this._realSpeed, Math.sin(a0) * this._realSpeed], b: [Math.cos(a1) * v1, Math.sin(a1) * v1] };
    this._playOneShot(best.name, T.moveBlend, best.t, 1);
    this._pivotTheta = theta; this._startTheta = theta; this._targetYaw = this._strafeTarget ?? this.facing;
    this._enter('pivot', `${best.name} @${best.t.toFixed(2)} ${Math.round(this.locoTheta)}>${Math.round(theta)}`);
    return true;
  }

  _enterFall(blend) {
    const n = CLIP_MAP.jump.fall;
    const a = this.actions[n]; a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveTimeScale(1); a.play();
    this._playOnly(n, blend); this.oneShot = null; this._enter('fall', n);
  }
  _enterJump(airborne = false) {
    const sp = this.planarVel.length();
    const key = (!this._movingNow || sp < 0.5) ? 'stand' : sp < 3 ? 'walk' : sp < 6.2 ? 'run' : 'sprint';
    const dir = key === 'stand' ? 'F' : this._jumpDir(this._thetaNow), P = CLIP_MAP.jump.prefix, K = key[0].toUpperCase() + key.slice(1);
    const at = (f) => (airborne ? f.takeoff : Math.max(0, f.takeoff - 0.18));
    const name = (P && this._bestByPose(dir === 'F' ? [`${P}F_Start_${K}_Lfoot`, `${P}F_Start_${K}_Rfoot`] : [`${P}${dir}_Start_Lfoot`, `${P}${dir}_Start_Rfoot`], at, (f) => f.takeoff)) || CLIP_MAP.jump.start[key];
    if (!this._has(name)) return;
    const f = this.feat[name];
    const start = at(f);
    this._playOneShot(name, 0.12, start, 0);
    this.oneShot = null;                       // no root motion: physics owns the jump
    this._jumpClip = name;
    this._takeoffIn = f.takeoff - start; this._impulseDone = false;
    this._enter('jumpStart', name);
  }
  _enterLand() {
    const impact = Math.abs(this._lastVy ?? 0), sp = this.planarVel.length();
    const key = sp < 0.8 ? 'stand' : sp < 3 ? 'walk' : sp < 6.2 ? 'run' : 'sprint';
    const set = CLIP_MAP.jump.land[key];
    const heavy = impact > this.heavyLandingSpeed && set.heavy && this._has(set.heavy);
    // direction of the landing: where the character is travelling relative to its body
    const v = this.planarVel, dir = sp < 0.8 ? 'F' : this._jumpDir(wrapDeg((this.facing - Math.atan2(v.x, v.z)) * DEG));
    const P = CLIP_MAP.jump.prefix, K = key[0].toUpperCase() + key.slice(1), W = heavy ? 'Heavy' : 'Light';
    const cands = !P ? [] : dir === 'F' ? [`${P}F_Land_${K}_${W}_Lfoot`, `${P}F_Land_${K}_${W}_Rfoot`]
      : key === 'stand' ? [`${P}${dir}_Land_Stand_${W}_Lfoot`, `${P}${dir}_Land_Stand_${W}_Rfoot`] : [`${P}${dir}_Land_${key === 'walk' ? 'Walk' : 'Run'}_${W}`];
    const name = this._bestByPose(cands, (f) => Math.max(0, f.landing - 0.05), (f) => f.landing) || (heavy ? set.heavy : set.light);
    if (!this._has(name)) { this._startIdle(0.2); return; }
    const f = this.feat[name];
    this._playOneShot(name, 0.1, Math.max(0, f.landing - 0.05), 0);
    this.oneShot = null;
    this._landClip = name;
    this._exitT = heavy ? 0.9 : (key === 'stand' ? 0.55 : 0.35);
    this._enter('land', `${name} (${heavy ? 'heavy' : 'light'}) impact=${impact.toFixed(1)}m/s`);
  }

  getDebug() {
    return {
      state: this.state, gait: this._gaitKey(), facingDeg: +(this.facing * DEG).toFixed(1),
      theta: +this.locoTheta.toFixed(1), locoSpeed: +(this.locoSpeed || 0).toFixed(2),
      clips: (this.debugWeights || []).map(([n, w]) => [n.replace('M_Neutral_', ''), +w.toFixed(2)]),
      inertial: this.inertializer?.active, locks: this.footLock?.legs.map((l) => (l.locked ? l.side.toUpperCase() : l.w > 0 ? l.side : '-')).join(''),
    };
  }
}
