// Erzeugt von scripts/build-figuren.mjs aus spiel.json des Pakets „Spielcharakter“ – nicht von Hand ändern.
// teile: Platz je Ausrüstungsteil · verdeckt: je Platz die Knochen (Ausdruck), deren Körperflächen unter dem Teil ausgeblendet werden
export const FIGUR_TEILE = {
  "teile": {
    "handschuh_01": "handschuh",
    "helm_01": "helm",
    "helm_02": "helm",
    "overall_01": "overall",
    "overall_02": "overall",
    "stiefel_01": "stiefel",
    "stiefel_02": "stiefel",
    "weste_01": "weste"
  },
  "verdeckt": {
    "handschuh": "^(hand|thumb|index|middle|ring|pinky|wrist)_",
    "stiefel": "^(foot|ball|ankle)_",
    "overall": "^(?!(head|neck|hand|wrist|thumb|index|middle|ring|pinky|foot|ball|ankle))"
  }
} as const;
