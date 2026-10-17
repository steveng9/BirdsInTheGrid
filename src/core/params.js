/**
 * Parameter defaults.
 *
 * A scenario is a partial config that is deep-merged over DEFAULTS. Every number here is
 * tagged in a comment as either [lit] (taken from, or close to, a published value that
 * still needs a citation check) or [placeholder] (chosen to make the model run; must be
 * replaced or swept before any claim depends on it). See PLAN.md, "Parameter provenance".
 *
 * Units: one cell is `cellMeters` on a side; one tick is the time a brood needs to walk
 * one cell.
 */

export const DEFAULTS = {
    world: {
        width: 240,           // cells; 240 x 5 m = 1.2 km square
        height: 240,
        cellMeters: 5,        // [placeholder] one lane is ~3.5 m, so a lane ~ a cell
    },

    // Road network. See layouts.js for the available types and their options.
    layout: {type: 'empty'},

    // Where the water is. See layouts.js.
    water: {type: 'coast', side: 'south', width: 20},

    // List of interventions, applied after layout and water. See layouts.js.
    mitigations: [],

    traffic: {
        // Hels & Buchwald (2001) style kill model: P(killed crossing one lane) =
        // 1 - exp(-q * a / v), q = vehicles per second in that lane, a = kill width
        // (tyre tracks plus body length) in metres, v = the animal's walking speed.
        killWidthM: 0.7,      // [placeholder] two tyre tracks (~0.2 m each) + bird length
        birdSpeedMps: 0.4,    // [placeholder] duckling walking pace
        // vph = vehicles per hour per lane; lanes = cells across the road.
        classes: {
            residential: {lanes: 2, vph: 60},     // [placeholder] quiet street
            collector:   {lanes: 2, vph: 300},    // [placeholder]
            arterial:    {lanes: 4, vph: 700},    // [placeholder] busy 4-lane road
            freeway:     {lanes: 8, vph: 1800},   // [lit] ~ freeway lane capacity (HCM)
        },
        hazardMultiplier: 1,  // global scale, used by the traffic-calming mitigation
    },

    birds: {
        mamas: 500,
        broodSize: 8,         // [lit] mallard mean clutch ~ 8-10; hatch < clutch
        nav: 'greedy',        // 'greedy' | 'oracle' | 'random'  (see season.js)
        noise: 0.35,          // greedy: sd of noise added to each step's score (cells)
        memory: 1.0,          // greedy: score penalty per previous visit to a cell
        roadAversion: 0,      // greedy: extra cost of stepping from verge onto road
        persistence: 0,       // greedy: cost of turning, per unit of (1 - cos turn angle) / 2; a full U-turn costs this much
        maxTicks: 4000,       // [placeholder] ~ 14 h at 5 m per ~12 s
        transitHazard: 0.00005, // [placeholder] per duckling per tick (predators, exhaustion)
        mamaTransitHazard: 0.00001, // [placeholder]
    },

    nest: {
        candidates: 20,       // [placeholder] sites a mama prospects before choosing
        seclusionCap: 40,     // cells; seclusion saturates 200 m from the nearest road
        waterCap: 120,        // cells; the water term saturates at 600 m
        wSeclusion: 1,        // weight on distance from roads (the cue she does use)
        wWater: 0,            // weight on proximity to water (the cue she ignores)
        wGreen: 0.3,          // bonus for vegetated cells (parks, corridors)
        noise: 0.1,
        // Nest survival (incubation). Only used when `predation` is true; seasons that
        // isolate the walk to water leave it off so every mama hatches a brood.
        predation: false,
        baseSurvival: 0.6,    // [placeholder] mallard nest success is often 0.1-0.5 [lit]
        roadPenalty: 0.3,     // extra loss right beside a road, decaying with distance
        roadScale: 10,
        shorePenalty: 0.4,    // extra loss at the shore (predators patrol edges)
        shoreScale: 15,
    },

    species: {
        count: 1,
        clustering: 0,        // 0: nest anywhere; 1: each species nests in its own strip
    },

    // Multi-year runs only (population.js).
    population: {
        years: 40,
        capacity: 500,        // breeding females the landscape supports
        adultSurvival: 0.6,   // [lit] adult female mallard annual survival ~0.5-0.7
        juvenileSurvival: 0.3, // [placeholder] water -> fledge -> first breeding season; set so a
                              // roadless landscape grows (lambda ~1.3 with nest predation)
        mutationSd: 0.05,     // on heritable nest weights
        evolve: false,        // whether wWater is heritable and mutates
    },
};

export function deepMerge(base, over) {
    if (over === undefined) return structuredClone(base);
    if (Array.isArray(over) || typeof over !== 'object' || over === null) return structuredClone(over);
    const out = structuredClone(base ?? {});
    for (const [k, v] of Object.entries(over)) {
        out[k] = (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object')
            ? deepMerge(out[k], v)
            : structuredClone(v);
    }
    return out;
}

/** Full config from a partial scenario. Layout and water objects replace, not merge. */
export function makeConfig(partial = {}) {
    const cfg = deepMerge(DEFAULTS, partial);
    if (partial.layout) cfg.layout = structuredClone(partial.layout);
    if (partial.water) cfg.water = structuredClone(partial.water);
    return cfg;
}
