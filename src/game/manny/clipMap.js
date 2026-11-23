// Clip names / name patterns used by MannyAnimator (Epic Game Animation Sample, retargeted to UE5 Manny).
// Change clips here only – the animator never hard-codes clip names.
// Groups given as RegExp collect every matching clip of the GLB; the animator measures each clip
// (direction, turn angle, foot contacts, pose) at load time and picks the best candidate at runtime.
const N = 'M_Neutral_';

export const CLIP_MAP = {
  idle: { stand: N + 'Stand_Idle_Loop', crouch: N + 'Crouch_Idle_Loop' },
  idleBreaks: {
    stand: [N + 'Stand_Idle_Break_v01', N + 'Stand_Idle_Break_v02'],
    crouch: [N + 'Crouch_Idle_Break_v01', N + 'Crouch_Idle_Break_v02'],
  },
  // looping locomotion per gait and direction (direction keys: UE naming; real direction is measured)
  loops: {
    walk:   { F: N + 'Walk_Loop_F', B: N + 'Walk_Loop_B', LL: N + 'Walk_Loop_LL', RR: N + 'Walk_Loop_RR',
              FL: N + 'Walk_Loop_FL', FR: N + 'Walk_Loop_FR', BL: N + 'Walk_Loop_BL', BR: N + 'Walk_Loop_BR',
              LR: N + 'Walk_Loop_LR', RL: N + 'Walk_Loop_RL' },
    run:    { F: N + 'Run_Loop_F', B: N + 'Run_Loop_B', LL: N + 'Run_Loop_LL', RR: N + 'Run_Loop_RR',
              FL: N + 'Run_Loop_FL', FR: N + 'Run_Loop_FR', BL: N + 'Run_Loop_BL', BR: N + 'Run_Loop_BR',
              LR: N + 'Run_Loop_LR', RL: N + 'Run_Loop_RL' },
    sprint: { F: N + 'Sprint_Loop_F', FL: N + 'Sprint_Loop_FL', FR: N + 'Sprint_Loop_FR' },
    crouch: { F: N + 'Crouch_Loop_F', B: N + 'Crouch_Loop_B', LL: N + 'Crouch_Loop_LL', RR: N + 'Crouch_Loop_RR',
              FL: N + 'Crouch_Loop_FL', FR: N + 'Crouch_Loop_FR' },
  },
  // candidate groups (RegExp over clip names)
  starts: {   // incl. "Reface" starts (start + turn towards the movement direction)
    walk: /^M_Neutral_Walk_(Start|Reface_Start)_/, run: /^M_Neutral_Run_(Start|Reface_Start)_/,
    sprint: /^M_Neutral_Sprint_(Start|Reface_Start)_/, crouch: /^M_Neutral_Crouch_(Start|Reface_Start)_/,
  },
  stops: {
    walk: /^M_Neutral_Walk_Stop_/, run: /^M_Neutral_Run_Stop_/, sprint: /^M_Neutral_Sprint_Stop_/, crouch: /^M_Neutral_Crouch_Stop_/,
  },
  turnInPlace: { stand: /^M_Neutral_Stand_Turn_\d+_[LR]$/, crouch: /^M_Neutral_Crouch_Idle_Turn_\d+_[LR]$/ },
  movingTurns: {   // turning while walking/running (orient-to-movement mode)
    walk: /^M_Neutral_Walk_Turn_[LR]_\d+_/, run: /^M_Neutral_Run_Turn_[LR]_\d+_/,
    sprint: /^M_Neutral_Sprint_Turn_[LR]_\d+_/, crouch: /^M_Neutral_Crouch_Turn_[LR]_\d+_/,
  },
  pivots: { walk: /^M_Neutral_Walk_Pivot_/, run: /^M_Neutral_Run_Pivot_/, crouch: /^M_Neutral_Crouch_Pivot_/ },
  jump: {
    start: { stand: N + 'Jump_F_Start_Stand_Lfoot', walk: N + 'Jump_F_Start_Walk_Lfoot',
             run: N + 'Jump_F_Start_Run_Lfoot', sprint: N + 'Jump_F_Start_Sprint_Lfoot' },
    fall: N + 'Jump_Loop_Fall',
    land: {
      stand:  { light: N + 'Jump_F_Land_Stand_Light_Lfoot', heavy: N + 'Jump_F_Land_Stand_Heavy_Lfoot' },
      walk:   { light: N + 'Jump_F_Land_Walk_Light_Lfoot',  heavy: N + 'Jump_F_Land_Walk_Heavy_Lfoot' },
      run:    { light: N + 'Jump_F_Land_Run_Light_Lfoot',   heavy: N + 'Jump_F_Land_Run_Heavy_Lfoot' },
      sprint: { light: N + 'Jump_F_Land_Sprint_Light_Lfoot' },
    },
  },
};

// preferred order when two loops move in (almost) the same direction – the first one wins
export const DIR_PRIORITY = ['F', 'B', 'LL', 'RR', 'FL', 'FR', 'BL', 'BR', 'LR', 'RL'];

// tuning values (override with new MannyAnimator({ tuning: {...} }))
export const TUNING = {
  tapTime: 0.25,          // s – key released earlier than this during a start = tap -> small step, back to idle
  tapSpeed: 1.0,          // m/s – also a tap while the start clip is still slower than this
  tapBlend: 0.25,         // s – start -> idle for a tap; root motion brakes to 0 over this time
  resumeLoopSpeed: 1.2,   // m/s – pressing again during a stop: faster -> loop, else a new start
  blend: 0.2,             // s – default transition (inertialization decay time)
  stopBlend: 0.12,        // s – loop -> stop (short; the entry is chosen by foot phase)
  moveBlend: 0.12,        // s – loop -> pivot / moving turn
  inertialization: true,  // false = hard switches everywhere
  footLock: true,         // two-bone IK foot locking
  footLockStates: ['idle', 'turn', 'settle', 'start', 'pivot', 'movingTurn'],   // not 'stop': measured worse there   // moving states: support foot only
  // responsiveness (v3)
  inputSmoothing: 0.05,   // s – direction / camera low-pass (hysteresis against jitter)
  minClipTime: 0.1,       // s – a clip may be interrupted / re-selected after this time
  reselectAngle: 30,      // deg – target direction jump that re-selects the clip (smaller changes: root rotation re-scaled)
  proceduralTurnRate: 540,// deg/s – fallback rotation when no clip fits (or a clip has no rotation left)
  turnPlaybackRate: 1.0,  // >1 plays turn / pivot / moving-turn clips faster (snappier, but feet slide more; 1.3 tested)
  maxCost: 2.5,           // pose-matching cost above which no clip is used (procedural fallback instead)
  turnThreshold: 45,      // deg – turn in place when the desired facing differs more than this (strafe / idle)
  movingTurnThreshold: 60,// deg – orient mode: use a Walk/Run_Turn clip above this direction change
  yawScaleRange: [0.5, 1.8],
  // loops (GaitCycle.js)
  loopCycles: true,       // blended loops play the clean gait cycle of each clip instead of the whole clip (which does not close)
  seamBlend: 0.12,        // s – blend when a loop goes round its cycle (its two ends fit to 4 – 15 cm, not exactly)
  cycleAir: 0.06,         // m – a seam with a foot on the ground costs this much more than one in the flight phase
  cycleBody: 0,           // > 0: choose the seam by the whole body too (smoother sprint seam, but the feet slide more: 450 against 356 cm)
  // calm start and stop for jogging (capsule-led, 2026-11-23): the Run starts / stops look like sprinting
  // Instead: straight from standing into the loop, the gait mixed by real speed (walk <-> run); on release the loop rolls out
  // the same way and the stop of the slower gait steps in once the character is slow. {} = old behaviour.
  calmGait: { run: 'walk' },   // gait -> slower gait that carries its start and stop
  softStartBlend: 0.25,   // s – standing -> loop
  softStopBlend: 0.2,     // s – loop -> stop of the slower gait
  coastSpeed: 1.5,        // m/s – below this the stop clip takes over
  coastMix: false,        // true = mix the gaits by speed while rolling out too (measured worse: the stride shrinks within 0.1 s)
};
