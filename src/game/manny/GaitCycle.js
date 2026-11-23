// Clean gait cycles of the loop clips.
//
// The loop clips of the GLB do not close: their last frame is 0.3 – 0.9 m (feet) away from their first one, so playing
// them round gives a jerk every few seconds. Inside each clip there are clean gait cycles, though. findCycle looks for
// the pair of samples (a, b), at least 0.45 s apart, whose poses (feet and their velocities) fit best – the clip is then
// played from a to b and round again; the small rest between the two ends is blended away (TUNING.seamBlend).
//
// (Until 2026-11-23 this lived in MotionMatcher.js. The motion matching search itself was built, measured worse than the
//  tuned states with this clip set and removed again – see docs/manny.md.)

/**
 * f: ClipFeatures of a loop clip (30 Hz samples)
 * opts.air:   m – a seam with a foot on the ground costs this much more than one in the flight phase (the blend over the
 *             seam shows as sliding on a foot that has just come down, in the air it does not)
 * opts.body:  > 0 = the best candidates are also compared with the whole body: 1 deg of mean rotation counts like `body`
 *             metres at the feet (needs opts.poseDist(ta, tb) -> deg). Makes the seam of the sprint smoother (7 -> 4 deg)
 *             but the feet slide more overall, so it is off.
 * returns { ia, ib: sample indices · a, b: times · gap: m between the two ends · speed: real travel speed over the cycle ·
 *           phi0: where in the cycle the left foot comes down (0..1) – loops are blended at the same gait phase }
 */
export function findCycle(f, opts = {}) {
  const n = f.n, min = Math.round(0.45 * 30), airCost = opts.air ?? 0.06, body = opts.body ?? 0;
  const d = (i, j) => Math.sqrt(f.footL[i].distanceToSquared(f.footL[j]) + f.footR[i].distanceToSquared(f.footR[j])
    + 0.01 * (f.velL[i].distanceToSquared(f.velL[j]) + f.velR[i].distanceToSquared(f.velR[j])));
  const air = (i) => !f.contactL[i] && !f.contactR[i] && !f.contactL[i + 1] && !f.contactR[i + 1];
  let bi = 0, bj = n - 1, bs = Infinity, bc = 0;
  const cand = [];
  for (let i = 1; i < n - min - 1; i++) for (let j = i + min; j < n - 1; j++) {
    // a slightly longer cycle is welcome when it fits as well
    const cst = d(i, j), score = cst - 0.0012 * (j - i) + (air(i) && air(j) ? 0 : airCost);
    if (score < bs) { bs = score; bi = i; bj = j; bc = cst; }
    if (cst < 0.3) cand.push([score, i, j, cst]);
  }
  if (opts.poseDist && cand.length && body > 0) {
    cand.sort((x, y) => x[0] - y[0]);
    let best = Infinity;
    for (const [score, i, j, cst] of cand.slice(0, 60)) {
      const s2 = score + body * opts.poseDist(f.ts[i], f.ts[j]);
      if (s2 < best) { best = s2; bi = i; bj = j; bc = cst; }
    }
  }
  const a = f.ts[bi], b = f.ts[bj];
  let phi0 = 0;
  for (let i = bi + 1; i < bj; i++) if (!f.contactL[i - 1] && f.contactL[i]) { phi0 = (f.ts[i] - a) / (b - a); break; }
  return { ia: bi, ib: bj, a, b, gap: bc, speed: (f.cum[bj] - f.cum[bi]) / (b - a), phi0 };
}
