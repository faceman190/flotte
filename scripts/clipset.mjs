// Welche Clips in den Bewegungssatz des Spiels kommen (scripts/build-clips.mjs).
// Quelle: die 19 GLB-Dateien des Game Animation Sample auf Mannys Skelett (1.879 Clips, OneDrive Blender/Spielfigur/Animationen,
// lokale Kopie asset-src/neu/spielfigur/animationen – nicht im Repository, 400 MB).

// Grundsatz bis 23.11.2026: die 321 Clips der ersten Fassung (asset-src/glb/lazy/Manny.glb)
export const BASE = [
  "M_Neutral_Crouch_Idle_Break_v01", "M_Neutral_Crouch_Idle_Break_v02", "M_Neutral_Crouch_Idle_Loop", "M_Neutral_Crouch_Idle_Turn_045_L",
  "M_Neutral_Crouch_Idle_Turn_045_R", "M_Neutral_Crouch_Idle_Turn_090_L", "M_Neutral_Crouch_Idle_Turn_090_R", "M_Neutral_Crouch_Idle_Turn_135_L",
  "M_Neutral_Crouch_Idle_Turn_135_R", "M_Neutral_Crouch_Idle_Turn_180_L", "M_Neutral_Crouch_Idle_Turn_180_R", "M_Neutral_Crouch_Loop_B",
  "M_Neutral_Crouch_Loop_F", "M_Neutral_Crouch_Loop_FL", "M_Neutral_Crouch_Loop_FR", "M_Neutral_Crouch_Loop_LL",
  "M_Neutral_Crouch_Loop_RR", "M_Neutral_Crouch_Reface_Start_B_L_090", "M_Neutral_Crouch_Reface_Start_B_L_180", "M_Neutral_Crouch_Reface_Start_B_R_090",
  "M_Neutral_Crouch_Reface_Start_B_R_180", "M_Neutral_Crouch_Reface_Start_F_L_090", "M_Neutral_Crouch_Reface_Start_F_L_180", "M_Neutral_Crouch_Reface_Start_F_R_090",
  "M_Neutral_Crouch_Reface_Start_F_R_180", "M_Neutral_Crouch_Start_BL_Lfoot", "M_Neutral_Crouch_Start_BL_Rfoot", "M_Neutral_Crouch_Start_BR_Lfoot",
  "M_Neutral_Crouch_Start_BR_Rfoot", "M_Neutral_Crouch_Start_B_Lfoot", "M_Neutral_Crouch_Start_B_Rfoot", "M_Neutral_Crouch_Start_FL_Lfoot",
  "M_Neutral_Crouch_Start_FL_Rfoot", "M_Neutral_Crouch_Start_FR_Lfoot", "M_Neutral_Crouch_Start_FR_Rfoot", "M_Neutral_Crouch_Start_F_Lfoot",
  "M_Neutral_Crouch_Start_F_Rfoot", "M_Neutral_Crouch_Start_LL_Lfoot", "M_Neutral_Crouch_Start_LL_Rfoot", "M_Neutral_Crouch_Start_LR_Lfoot",
  "M_Neutral_Crouch_Start_LR_Rfoot", "M_Neutral_Crouch_Start_RL_Lfoot", "M_Neutral_Crouch_Start_RL_Rfoot", "M_Neutral_Crouch_Start_RR_Lfoot",
  "M_Neutral_Crouch_Start_RR_Rfoot", "M_Neutral_Crouch_Stop_BL_Lfoot", "M_Neutral_Crouch_Stop_BL_Rfoot", "M_Neutral_Crouch_Stop_BR_Lfoot",
  "M_Neutral_Crouch_Stop_BR_Rfoot", "M_Neutral_Crouch_Stop_B_Lfoot", "M_Neutral_Crouch_Stop_B_Rfoot", "M_Neutral_Crouch_Stop_FL_Lfoot",
  "M_Neutral_Crouch_Stop_FL_Rfoot", "M_Neutral_Crouch_Stop_FR_Lfoot", "M_Neutral_Crouch_Stop_FR_Rtfoot", "M_Neutral_Crouch_Stop_F_Lfoot",
  "M_Neutral_Crouch_Stop_F_Rfoot", "M_Neutral_Crouch_Stop_LL_Lfoot", "M_Neutral_Crouch_Stop_LL_Rfoot", "M_Neutral_Crouch_Stop_LR_Lfoot",
  "M_Neutral_Crouch_Stop_LR_Rfoot", "M_Neutral_Crouch_Stop_RL_Lfoot", "M_Neutral_Crouch_Stop_RL_Rfoot", "M_Neutral_Crouch_Stop_RR_Lfoot",
  "M_Neutral_Crouch_Stop_RR_Rfoot", "M_Neutral_Crouch_Turn_L_045_Lfoot", "M_Neutral_Crouch_Turn_L_045_Rfoot", "M_Neutral_Crouch_Turn_L_090_Lfoot",
  "M_Neutral_Crouch_Turn_L_090_Rfoot", "M_Neutral_Crouch_Turn_L_135_Lfoot", "M_Neutral_Crouch_Turn_L_135_Rfoot", "M_Neutral_Crouch_Turn_L_180_Lfoot",
  "M_Neutral_Crouch_Turn_L_180_Rfoot", "M_Neutral_Crouch_Turn_R_045_Lfoot", "M_Neutral_Crouch_Turn_R_045_Rfoot", "M_Neutral_Crouch_Turn_R_090_Lfoot",
  "M_Neutral_Crouch_Turn_R_090_Rfoot", "M_Neutral_Crouch_Turn_R_135_Lfoot", "M_Neutral_Crouch_Turn_R_135_Rfoot", "M_Neutral_Crouch_Turn_R_180_Lfoot",
  "M_Neutral_Crouch_Turn_R_180_Rfoot", "M_Neutral_Jump_F_Land_Run_Heavy_Lfoot", "M_Neutral_Jump_F_Land_Run_Light_Lfoot", "M_Neutral_Jump_F_Land_Sprint_Light_Lfoot",
  "M_Neutral_Jump_F_Land_Stand_Heavy_Lfoot", "M_Neutral_Jump_F_Land_Stand_Light_Lfoot", "M_Neutral_Jump_F_Land_Walk_Heavy_Lfoot", "M_Neutral_Jump_F_Land_Walk_Light_Lfoot",
  "M_Neutral_Jump_F_Start_Run_Lfoot", "M_Neutral_Jump_F_Start_Sprint_Lfoot", "M_Neutral_Jump_F_Start_Stand_Lfoot", "M_Neutral_Jump_F_Start_Walk_Lfoot",
  "M_Neutral_Jump_Loop_Fall", "M_Neutral_Run_Loop_B", "M_Neutral_Run_Loop_BL", "M_Neutral_Run_Loop_BR",
  "M_Neutral_Run_Loop_F", "M_Neutral_Run_Loop_FL", "M_Neutral_Run_Loop_FR", "M_Neutral_Run_Loop_LL",
  "M_Neutral_Run_Loop_LR", "M_Neutral_Run_Loop_RL", "M_Neutral_Run_Loop_RR", "M_Neutral_Run_Pivot_BL_FR_Lfoot",
  "M_Neutral_Run_Pivot_BL_FR_Rfoot", "M_Neutral_Run_Pivot_BR_FL_Lfoot", "M_Neutral_Run_Pivot_BR_FL_Rfoot", "M_Neutral_Run_Pivot_B_F_Lfoot",
  "M_Neutral_Run_Pivot_B_F_Rfoot", "M_Neutral_Run_Pivot_FL_BR_Lfoot", "M_Neutral_Run_Pivot_FL_BR_Rfoot", "M_Neutral_Run_Pivot_FR_BL_Lfoot",
  "M_Neutral_Run_Pivot_FR_BL_Rfoot", "M_Neutral_Run_Pivot_F_B_Lfoot", "M_Neutral_Run_Pivot_F_B_Rfoot", "M_Neutral_Run_Pivot_LL_RL_Lfoot",
  "M_Neutral_Run_Pivot_LL_RL_Rfoot", "M_Neutral_Run_Pivot_LR_RR_Lfoot", "M_Neutral_Run_Pivot_LR_RR_Rfoot", "M_Neutral_Run_Pivot_RL_LL_Lfoot",
  "M_Neutral_Run_Pivot_RL_LL_Rfoot", "M_Neutral_Run_Pivot_RR_LR_Lfoot", "M_Neutral_Run_Pivot_RR_LR_Rfoot", "M_Neutral_Run_Reface_Start_B_L_090",
  "M_Neutral_Run_Reface_Start_B_L_180", "M_Neutral_Run_Reface_Start_B_R_090", "M_Neutral_Run_Reface_Start_B_R_180", "M_Neutral_Run_Reface_Start_F_L_090",
  "M_Neutral_Run_Reface_Start_F_L_180", "M_Neutral_Run_Reface_Start_F_R_090", "M_Neutral_Run_Reface_Start_F_R_180", "M_Neutral_Run_Start_BL_Lfoot",
  "M_Neutral_Run_Start_BL_Rfoot", "M_Neutral_Run_Start_BR_Lfoot", "M_Neutral_Run_Start_BR_Rfoot", "M_Neutral_Run_Start_B_Lfoot",
  "M_Neutral_Run_Start_B_Rfoot", "M_Neutral_Run_Start_FL_Lfoot", "M_Neutral_Run_Start_FL_Rfoot", "M_Neutral_Run_Start_FR_Lfoot",
  "M_Neutral_Run_Start_FR_Rfoot", "M_Neutral_Run_Start_F_Lfoot", "M_Neutral_Run_Start_F_Rfoot", "M_Neutral_Run_Start_LL_Lfoot",
  "M_Neutral_Run_Start_LL_Rfoot", "M_Neutral_Run_Start_LR_Lfoot", "M_Neutral_Run_Start_LR_Rfoot", "M_Neutral_Run_Start_RL_Lfoot",
  "M_Neutral_Run_Start_RL_Rfoot", "M_Neutral_Run_Start_RR_Lfoot", "M_Neutral_Run_Start_RR_Rfoot", "M_Neutral_Run_Stop_BL_Lfoot",
  "M_Neutral_Run_Stop_BL_Rfoot", "M_Neutral_Run_Stop_BR_Lfoot", "M_Neutral_Run_Stop_BR_Rfoot", "M_Neutral_Run_Stop_B_Lfoot",
  "M_Neutral_Run_Stop_B_Rfoot", "M_Neutral_Run_Stop_FL_Lfoot", "M_Neutral_Run_Stop_FL_Rfoot", "M_Neutral_Run_Stop_FR_Lfoot",
  "M_Neutral_Run_Stop_FR_Rfoot", "M_Neutral_Run_Stop_F_Lfoot", "M_Neutral_Run_Stop_F_Rfoot", "M_Neutral_Run_Stop_LL_Lfoot",
  "M_Neutral_Run_Stop_LL_Rfoot", "M_Neutral_Run_Stop_LR_Lfoot", "M_Neutral_Run_Stop_LR_Rfoot", "M_Neutral_Run_Stop_RL_Lfoot",
  "M_Neutral_Run_Stop_RL_Rfoot", "M_Neutral_Run_Stop_RR_Lfoot", "M_Neutral_Run_Stop_RR_Rfoot", "M_Neutral_Run_Turn_L_045_Lfoot",
  "M_Neutral_Run_Turn_L_045_Rfoot", "M_Neutral_Run_Turn_L_090_Lfoot", "M_Neutral_Run_Turn_L_090_Rfoot", "M_Neutral_Run_Turn_L_135_Lfoot",
  "M_Neutral_Run_Turn_L_135_Rfoot", "M_Neutral_Run_Turn_L_180_Lfoot", "M_Neutral_Run_Turn_L_180_Rfoot", "M_Neutral_Run_Turn_R_045_Lfoot",
  "M_Neutral_Run_Turn_R_045_Rfoot", "M_Neutral_Run_Turn_R_090_Lfoot", "M_Neutral_Run_Turn_R_090_Rfoot", "M_Neutral_Run_Turn_R_135_Lfoot",
  "M_Neutral_Run_Turn_R_135_Rfoot", "M_Neutral_Run_Turn_R_180_Lfoot", "M_Neutral_Run_Turn_R_180_Rfoot", "M_Neutral_Sprint_Loop_F",
  "M_Neutral_Sprint_Loop_FL", "M_Neutral_Sprint_Loop_FR", "M_Neutral_Sprint_Reface_Start_F_L_090", "M_Neutral_Sprint_Reface_Start_F_L_180",
  "M_Neutral_Sprint_Reface_Start_F_R_090", "M_Neutral_Sprint_Reface_Start_F_R_180", "M_Neutral_Sprint_Start_FL_Lfoot", "M_Neutral_Sprint_Start_FL_Rfoot",
  "M_Neutral_Sprint_Start_FR_Lfoot", "M_Neutral_Sprint_Start_FR_Rfoot", "M_Neutral_Sprint_Start_F_Lfoot", "M_Neutral_Sprint_Start_F_Rfoot",
  "M_Neutral_Sprint_Stop_FL_Lfoot", "M_Neutral_Sprint_Stop_FL_Rfoot", "M_Neutral_Sprint_Stop_FR_Lfoot", "M_Neutral_Sprint_Stop_FR_Rfoot",
  "M_Neutral_Sprint_Stop_F_Lfoot", "M_Neutral_Sprint_Stop_F_Rfoot", "M_Neutral_Sprint_Turn_L_090_Lfoot", "M_Neutral_Sprint_Turn_L_090_Rfoot",
  "M_Neutral_Sprint_Turn_L_180_Lfoot", "M_Neutral_Sprint_Turn_L_180_Rfoot", "M_Neutral_Sprint_Turn_R_090_Lfoot", "M_Neutral_Sprint_Turn_R_090_Rfoot",
  "M_Neutral_Sprint_Turn_R_180_Lfoot", "M_Neutral_Sprint_Turn_R_180_Rfoot", "M_Neutral_Stand_Idle_Break_v01", "M_Neutral_Stand_Idle_Break_v02",
  "M_Neutral_Stand_Idle_Loop", "M_Neutral_Stand_Turn_045_L", "M_Neutral_Stand_Turn_045_R", "M_Neutral_Stand_Turn_090_L",
  "M_Neutral_Stand_Turn_090_R", "M_Neutral_Stand_Turn_135_L", "M_Neutral_Stand_Turn_135_R", "M_Neutral_Stand_Turn_180_L",
  "M_Neutral_Stand_Turn_180_R", "M_Neutral_Walk_Loop_B", "M_Neutral_Walk_Loop_BL", "M_Neutral_Walk_Loop_BR",
  "M_Neutral_Walk_Loop_F", "M_Neutral_Walk_Loop_FL", "M_Neutral_Walk_Loop_FR", "M_Neutral_Walk_Loop_LL",
  "M_Neutral_Walk_Loop_LR", "M_Neutral_Walk_Loop_RL", "M_Neutral_Walk_Loop_RR", "M_Neutral_Walk_Pivot_BL_FR_Lfoot",
  "M_Neutral_Walk_Pivot_BL_FR_Rfoot", "M_Neutral_Walk_Pivot_BR_FL_Lfoot", "M_Neutral_Walk_Pivot_BR_FL_Rfoot", "M_Neutral_Walk_Pivot_B_F_Lfoot",
  "M_Neutral_Walk_Pivot_B_F_Rfoot", "M_Neutral_Walk_Pivot_FL_BR_Lfoot", "M_Neutral_Walk_Pivot_FL_BR_Rfoot", "M_Neutral_Walk_Pivot_FR_BL_Lfoot",
  "M_Neutral_Walk_Pivot_FR_BL_Rfoot", "M_Neutral_Walk_Pivot_F_B_Lfoot", "M_Neutral_Walk_Pivot_F_B_Rfoot", "M_Neutral_Walk_Pivot_LL_RL_Lfoot",
  "M_Neutral_Walk_Pivot_LL_RL_Rfoot", "M_Neutral_Walk_Pivot_LR_RR_Lfoot", "M_Neutral_Walk_Pivot_LR_RR_Rfoot", "M_Neutral_Walk_Pivot_RL_LL_Lfoot",
  "M_Neutral_Walk_Pivot_RL_LL_Rfoot", "M_Neutral_Walk_Pivot_RR_LR_Lfoot", "M_Neutral_Walk_Pivot_RR_LR_Rfoot", "M_Neutral_Walk_Reface_Start_B_L_090",
  "M_Neutral_Walk_Reface_Start_B_L_180", "M_Neutral_Walk_Reface_Start_B_R_090", "M_Neutral_Walk_Reface_Start_B_R_180", "M_Neutral_Walk_Reface_Start_F_L_090",
  "M_Neutral_Walk_Reface_Start_F_L_180", "M_Neutral_Walk_Reface_Start_F_L_180_backstep", "M_Neutral_Walk_Reface_Start_F_R_090", "M_Neutral_Walk_Reface_Start_F_R_180",
  "M_Neutral_Walk_Reface_Start_F_R_180_backstep", "M_Neutral_Walk_Start_BL_Lfoot", "M_Neutral_Walk_Start_BL_Rfoot", "M_Neutral_Walk_Start_BR_Lfoot",
  "M_Neutral_Walk_Start_BR_Rfoot", "M_Neutral_Walk_Start_B_Lfoot", "M_Neutral_Walk_Start_B_Rfoot", "M_Neutral_Walk_Start_FL_Lfoot",
  "M_Neutral_Walk_Start_FL_Rfoot", "M_Neutral_Walk_Start_FR_Lfoot", "M_Neutral_Walk_Start_FR_Rfoot", "M_Neutral_Walk_Start_F_Lfoot",
  "M_Neutral_Walk_Start_F_Rfoot", "M_Neutral_Walk_Start_LL_Lfoot", "M_Neutral_Walk_Start_LL_Rfoot", "M_Neutral_Walk_Start_LR_Lfoot",
  "M_Neutral_Walk_Start_LR_Rfoot", "M_Neutral_Walk_Start_RL_Lfoot", "M_Neutral_Walk_Start_RL_Rfoot", "M_Neutral_Walk_Start_RR_Lfoot",
  "M_Neutral_Walk_Start_RR_Rfoot", "M_Neutral_Walk_Stop_BL_Lfoot", "M_Neutral_Walk_Stop_BL_Rfoot", "M_Neutral_Walk_Stop_BR_Lfoot",
  "M_Neutral_Walk_Stop_BR_Rfoot", "M_Neutral_Walk_Stop_B_Lfoot", "M_Neutral_Walk_Stop_B_Rfoot", "M_Neutral_Walk_Stop_FL_Lfoot",
  "M_Neutral_Walk_Stop_FL_Rfoot", "M_Neutral_Walk_Stop_FR_Lfoot", "M_Neutral_Walk_Stop_FR_Rfoot", "M_Neutral_Walk_Stop_F_Lfoot",
  "M_Neutral_Walk_Stop_F_Rfoot", "M_Neutral_Walk_Stop_LL_Lfoot", "M_Neutral_Walk_Stop_LL_Rfoot", "M_Neutral_Walk_Stop_LR_Lfoot",
  "M_Neutral_Walk_Stop_LR_Rfoot", "M_Neutral_Walk_Stop_RL_Lfoot", "M_Neutral_Walk_Stop_RL_Rfoot", "M_Neutral_Walk_Stop_RR_Lfoot",
  "M_Neutral_Walk_Stop_RR_Rfoot", "M_Neutral_Walk_Turn_L_045_Lfoot", "M_Neutral_Walk_Turn_L_045_Rfoot", "M_Neutral_Walk_Turn_L_090_Lfoot",
  "M_Neutral_Walk_Turn_L_090_Rfoot", "M_Neutral_Walk_Turn_L_135_Lfoot", "M_Neutral_Walk_Turn_L_135_Rfoot", "M_Neutral_Walk_Turn_L_180_Lfoot",
  "M_Neutral_Walk_Turn_L_180_Rfoot", "M_Neutral_Walk_Turn_R_045_Lfoot", "M_Neutral_Walk_Turn_R_045_Rfoot", "M_Neutral_Walk_Turn_R_090_Lfoot",
  "M_Neutral_Walk_Turn_R_090_Rfoot", "M_Neutral_Walk_Turn_R_135_Lfoot", "M_Neutral_Walk_Turn_R_135_Rfoot", "M_Neutral_Walk_Turn_R_180_Lfoot",
  "M_Neutral_Walk_Turn_R_180_Rfoot",
];

// Dazu seit dem 23.11.2026 (vollständiger Satz mit 1.879 Clips liegt vor). Nur was der Animator auch nutzt – jeder Clip kostet Download.
export const EXTRA = [
  /^M_Neutral_AO_(Stand|Crouch)_X/,                          // Blickposen: Oberkörper folgt dem Blick (AimLayer in PoseLayers.js)
  /^M_Neutral_(Run_Lean_Pose|Sprint_Pose_Lean)_/,            // Neigen in die Kurve
  /^M_Neutral_(Stand|Crouch)_Idle_Break_v\d+$/,              // Abwechslung im Stand
  /^M_Neutral_Transition_(Crouch_to_Stand|Stand_to_Crouch)$/,// Hinhocken und Aufstehen
  /^M_Neutral_Crouch_Loop_(BL|BR|LR|RL)$/,                   // geduckt: die vier fehlenden Richtungen
  /^M_Neutral_Jump_(B|LL|RL|F)_(Start|Land)_/,               // Sprung in alle vier Richtungen, beide Füße
  /^M_relaxed_ragdoll_shove_stand_[BFLR]_V$/,                // umgeworfen werden und liegen bleiben: der Tod der Figur
  // Richtungswechsel beim seitlichen Laufen: Setzschritt von jeder Richtung in jede (90° Box und Diamond, 135° Hourglass und Diamond;
  // 180° sind die Pivot-Clips der Grundauswahl), in beiden Seitwärts-Haltungen (LL / RR und LR / RL)
  /^M_Neutral_(Run|Crouch)_(Box|Diamond|Hourglass)_/,
  /^M_ragdoll_getup_stand_[BFLR]$/,                          // Liegeposen (erstes Bild der Aufsteh-Clips): darin kommt der Sturz zur Ruhe
  /^M_Relaxed_Run_(Loop|Start|Stop|Pivot|Turn)_/,            // lockerer Stil in Stationen und Städten (seit 2026-11-24): Laufen …
  /^M_Relaxed_Walk_(Loop|Start|Stop)_/,                      // … Gehen (sanftes Anlaufen und Anhalten laufen über die Gehschleifen) …
  /^M_Relaxed_Stand_(Idle|Turn)_/,                           // … Stehen, Pausen, Drehen auf der Stelle (MannyAnimator setStyle)
];

// Knochen, deren Spuren nie gebraucht werden (keine Haut, keine Kinder mit Haut): Hilfsknochen für Unreals eigene IK
export const DROP_BONES = [/^ik_/, /^center_of_mass$/, /^interaction$/];

// ---------- Waffenhaltung: Clips aus Epics Lyra Starter Game (seit 2026-11-23) ----------
// Quelle: OneDrive Blender/lyra_paket.zip, entpackt nach asset-src/neu/lyra (nicht im Repository). Dasselbe Skelett wie der Satz oben.
// Diese Clips spielt nicht der Mixer, sondern die Waffenschicht (src/game/manny/WeaponLayer.js): Sie legt nur den Oberkörper über das
// Laufen. Deshalb bleiben von ihnen nur die Drehspuren des Oberkörpers (und des Beckens als Bezug) und die Lage des Waffenknochens.
export const LYRA = [
  /^MM_(Rifle|Pistol|Shotgun)_Idle_(Hipfire|ADS)$/,          // Grundhaltung: Waffe gesenkt und im Anschlag
  /^MM_(Rifle|Pistol)_Crouch_Idle$/,                         // geduckt
  /^MM_Rifle_(Idle_Hipfire|Idle_ADS|Crouch_Idle)_AO_/,       // Zielposen: Oberkörper und Waffe folgen dem Blick
  /^MM_Pistol_Idle_ADS_AO_/,
  /^MM_(Rifle|Pistol|Shotgun)_(Fire|Reload)$/,               // Rückstoß (Aufschlag auf die Zielpose) und Nachladen
  /^MM_(Rifle|Pistol)_Equip$/,                               // Waffe ziehen
  /^MM_Rifle_GrenadeToss$/,                                  // Granate werfen
  /^MM_HitReact_/,                                           // Treffer (Aufschlag)
  /^MM_(Rifle|Pistol)_Jog_Fwd$/,                             // Tragehaltung in der Bewegung: Waffe gesenkt quer vor dem Körper
];
export const LYRA_BONES = /^(pelvis|spine_0\d|neck_0\d|head|clavicle_[lr]|upperarm_[lr]|lowerarm_[lr]|hand_[lr]|(index|middle|ring|pinky|thumb)_.*|weapon_[lr]|(upperarm|lowerarm)_twist_0\d_[lr])$/;
export const LYRA_MOVE = /^weapon_[lr]$/;                    // nur diese Knochen behalten ihre Verschiebespur
