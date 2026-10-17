/**
 * Run one (experiment, variant, seed) headlessly and return a plain-object result for
 * the store. Used directly by the CLI and inside worker threads by the sweep.
 */

import {Random} from '../core/rng.js';
import {makeConfig} from '../core/params.js';
import {buildWorld} from '../core/layouts.js';
import {computeFields} from '../core/fields.js';
import {Season} from '../core/season.js';
import {Population} from '../core/population.js';

export function runOne({experiment, variant, seed, kind = 'season', config, placement}) {
    let cfg = makeConfig(config);
    let extra = null;
    if (placement) {
        const positions = placeCrossings(cfg, seed, placement);
        cfg.mitigations = [...cfg.mitigations,
            {type: 'underpasses', classes: placement.classes, positions, driftFence: !!placement.driftFence}];
        extra = {positions};
    }
    const rng = new Random(seed);
    const world = buildWorld(cfg, rng.fork('world'));
    const fields = computeFields(world);
    if (kind === 'population') {
        const pop = new Population(world, fields, cfg, rng.fork('population'));
        const years = pop.run();
        const last = years[years.length - 1];
        // The run row holds the final year's state; per-year detail is in `years`.
        const summary = {
            mamas: last?.nextBreeders ?? 0,
            youngArrivalRate: mean(years.map(y => y.youngArrivalRate)),
            speciesExtinct: cfg.species.count - (last?.speciesAlive ?? 0),
            species: (last?.perSpecies ?? []).map(n => ({mamas: n})),
            ticks: years.length,
        };
        return {experiment, variant, seed, kind, summary, years, config: cfg, extra};
    }
    const season = new Season(world, fields, cfg, rng.fork('season'));
    const summary = season.run();
    return {experiment, variant, seed, kind, summary, broods: season.broods, config: cfg, extra};
}

const mean = (xs) => xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : null;

/**
 * Choose `budget` crossing positions on roads of `classes`.
 *
 *   hotspot  Run a pilot season (different seed) with no crossings, count road deaths
 *            per road cross-section, and take the deadliest. This is how road ecologists
 *            usually site crossings: from roadkill surveys.
 *   even     Spread evenly along the candidate road length.
 *   random   Uniformly at random.
 */
export function placeCrossings(cfg, seed, {strategy, budget, classes = ['arterial', 'freeway']}) {
    // Same world as the real run (same seed), but a different pilot cohort of birds.
    const world = buildWorld(cfg, new Random(seed).fork('world'));
    const rng = new Random(seed + 100000);
    const candidates = [];
    for (const s of world.roads.filter(s => classes.includes(s.cls))) {
        for (let p = s.from; p <= s.to - 1; p++) {
            const [x, y] = s.orient === 'h' ? [p, s.at] : [s.at, p];
            // Skip intersections: a crossing there would be a hole in another road.
            const cross = s.orient === 'h' ? world.type[world.idx(x, Math.max(0, s.at - 1))] : world.type[world.idx(Math.max(0, s.at - 1), y)];
            if (cross === 2) continue;
            candidates.push({s, p, x, y, score: 0});
        }
    }
    if (candidates.length === 0 || budget === 0) return [];
    if (strategy === 'random') {
        return rng.fork('place').shuffle(candidates).slice(0, budget).map(({x, y}) => ({x, y}));
    }
    if (strategy === 'even') {
        const step = candidates.length / budget;
        return Array.from({length: budget}, (_, k) => candidates[Math.floor((k + 0.5) * step)]).map(({x, y}) => ({x, y}));
    }
    // hotspot
    const fields = computeFields(world);
    const pilot = new Season(world, fields, cfg, rng.fork('pilot'));
    pilot.run();
    for (const c of candidates) {
        for (let q = c.p - 2; q <= c.p + 3; q++) {
            for (let a = c.s.at; a < c.s.at + c.s.width; a++) {
                const [x, y] = c.s.orient === 'h' ? [q, a] : [a, q];
                if (world.inBounds(x, y)) c.score += pilot.deathMap[world.idx(x, y)];
            }
        }
    }
    const chosen = [];
    for (const c of candidates.slice().sort((a, b) => b.score - a.score)) {
        if (chosen.length >= budget) break;
        if (chosen.some(o => o.s === c.s && Math.abs(o.p - c.p) < 8)) continue;
        chosen.push(c);
    }
    return chosen.map(({x, y}) => ({x, y}));
}
