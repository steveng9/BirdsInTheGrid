/**
 * Closed-form expectations the simulation can be checked against.
 *
 * These are deliberately simple. Where the simulation agrees with them, the result
 * needs no simulation to explain it; where it departs from them, the departure is the
 * part worth writing about (detours around walls, time spent sliding along barriers,
 * birds that never find the gap).
 */

/**
 * Expected number of road lines a straight walk of length L crosses on a square grid
 * of street spacing s (centre to centre), for a uniformly random heading. This is the
 * Buffon / Cauchy-Crofton result: E = 4L / (pi s). For a heading perpendicular to one
 * family of streets (a shoreline due south, say) it is simply L / s.
 */
export function expectedCrossings(L, s, heading = 'random') {
    return heading === 'random' ? 4 * L / (Math.PI * s) : L / s;
}

/** P(one bird survives one lane), the Hels & Buchwald (2001) form. */
export function laneSurvival(vph, killWidthM, speedMps) {
    return Math.exp(-(vph / 3600) * killWidthM / speedMps);
}

/**
 * A brood crossing N roads of `lanes` lanes, each lane survived with probability `ps`:
 * the mama survives with ps^(lanes N); each duckling arrives only if it and its mother
 * both survive, so the expected fraction of young that arrive is ps^(2 lanes N).
 */
export function broodExpectation(N, lanes, ps, broodSize) {
    const bird = ps ** (lanes * N);
    return {mama: bird, youngFraction: bird * bird, youngExpected: broodSize * bird * bird,
        broodSuccess: bird * (1 - (1 - bird) ** broodSize)};
}

/**
 * Expected number of species with zero surviving young after one season, when N
 * mamas are split evenly among n species and each mama independently succeeds with
 * probability q. Pure binomial bookkeeping: n (1 - q)^(N / n).
 */
export function expectedExtinct(n, N, q) {
    return n * (1 - q) ** (N / n);
}

/** Per-female annual growth factor. Replacement needs lambda >= 1. */
export function lambda(adultSurvival, juvenileSurvival, youngPerFemale) {
    return adultSurvival + (juvenileSurvival / 2) * youngPerFemale;
}
