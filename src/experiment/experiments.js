/**
 * Experiment definitions. Each experiment is a list of variants; each variant is a
 * partial config (merged over params.DEFAULTS) plus a label. The sweep runs every
 * variant for every seed. See PLAN.md for the question each experiment answers.
 */

const COAST = {type: 'coast', side: 'south', width: 20};
const GRID = {type: 'grid', block: 20, arterialEvery: 4, parkFraction: 0.15};
const FWY_BARRIER = {type: 'freeway', median: 'barrier'};

const v = (label, config, more = {}) => ({label, config, ...more});

export const EXPERIMENTS = {
    // E1. Single roads against an empty landscape. Shoreline to the south, road across
    // the middle, so about half the nests are on the far side.
    'e1-single-roads': {
        question: 'How much does one road cost, by road type and median design?',
        variants: [
            v('none', {layout: {type: 'empty'}}),
            v('residential', {layout: {type: 'road', cls: 'residential'}}),
            v('collector', {layout: {type: 'road', cls: 'collector'}}),
            v('arterial', {layout: {type: 'road', cls: 'arterial'}}),
            v('freeway, undivided', {layout: {type: 'freeway'}}),
            v('freeway, grass median', {layout: {type: 'freeway', median: 'grass'}}),
            v('freeway, jersey barrier', {layout: FWY_BARRIER}),
            v('freeway, barrier + 4 gaps', {layout: {...FWY_BARRIER, medianGaps: 4}}),
            // At default volumes almost nobody survives eight lanes, so median design
            // cannot matter. At a tenth of the traffic it can.
            v('freeway x0.1, undivided', {layout: {type: 'freeway'}, traffic: {hazardMultiplier: 0.1}}),
            v('freeway x0.1, grass median', {layout: {type: 'freeway', median: 'grass'}, traffic: {hazardMultiplier: 0.1}}),
            v('freeway x0.1, jersey barrier', {layout: FWY_BARRIER, traffic: {hazardMultiplier: 0.1}}),
            v('freeway x0.1, barrier + 4 gaps', {layout: {...FWY_BARRIER, medianGaps: 4}, traffic: {hazardMultiplier: 0.1}}),
        ],
    },

    // E2. Whole urban forms, same shoreline.
    'e2-urban-form': {
        question: 'Which street patterns are hardest to walk through?',
        variants: [
            v('none', {layout: {type: 'empty'}}),
            v('grid, 50 m blocks', {layout: {...GRID, block: 10, arterialEvery: 0}}),
            v('grid, 100 m blocks', {layout: {...GRID, arterialEvery: 0}}),
            v('grid, 200 m blocks', {layout: {...GRID, block: 40, arterialEvery: 0}}),
            v('grid 100 m + arterials', {layout: GRID}),
            v('grid 100 m + arterials, no buildings', {layout: {...GRID, buildings: false, parkFraction: 0}}),
            v('suburban superblocks', {layout: {type: 'suburban'}}),
            v('suburban, no sound walls', {layout: {type: 'suburban', soundWalls: false}}),
            v('suburban, open back fences', {layout: {type: 'suburban', gateProb: 0.6}}),
        ],
    },

    // E3. Same landscapes, three navigators. The gap between greedy and oracle is the
    // cost of not knowing the map; the gap between oracle and 'none' is what the
    // landscape takes even from a bird that does.
    'e3-navigation': {
        question: 'How much of the loss is the bird not knowing the map?',
        variants: ['greedy', 'oracle', 'random'].flatMap(nav => [
            v(`arterial / ${nav}`, {layout: {type: 'road', cls: 'arterial'}, birds: {nav}}),
            v(`freeway barrier + gaps / ${nav}`, {layout: {...FWY_BARRIER, medianGaps: 4}, birds: {nav}}),
            v(`grid + arterials / ${nav}`, {layout: GRID, birds: {nav}}),
            v(`suburban / ${nav}`, {layout: {type: 'suburban'}, birds: {nav}}),
            v(`grid, fenced pond, 1 gap / ${nav}`, {layout: GRID, water: {type: 'pond', r: 18, fenced: true, fenceGaps: 1}, birds: {nav}}),
            // Safe crossings with no fence to steer birds to them.
            v(`freeway barrier + underpasses / ${nav}`, {layout: FWY_BARRIER, birds: {nav},
                mitigations: [{type: 'underpasses', spacing: 60, classes: ['freeway']}]}),
            v(`grid + arterial underpasses / ${nav}`, {layout: GRID, birds: {nav},
                mitigations: [{type: 'underpasses', spacing: 40, classes: ['arterial']}]}),
        ]),
    },

    // E4. Where the water is, how it is split up, and whether it is fenced.
    'e4-water': {
        question: 'Single large or several small? Fenced or open?',
        variants: [
            v('coast (south edge)', {layout: GRID, water: COAST}),
            v('river (centre)', {layout: GRID, water: {type: 'river', position: 0.5, width: 8}}),
            v('1 pond', {layout: GRID, water: {type: 'pond', r: 22.6}}),
            v('4 ponds', {layout: GRID, water: {type: 'ponds', count: 4, totalArea: 1600}}),
            v('16 ponds', {layout: GRID, water: {type: 'ponds', count: 16, totalArea: 1600}}),
            v('1 pond, fenced', {layout: GRID, water: {type: 'pond', r: 22.6, fenced: true}}),
            v('4 ponds, fenced', {layout: GRID, water: {type: 'ponds', count: 4, totalArea: 1600, fenced: true}}),
            v('16 ponds, fenced', {layout: GRID, water: {type: 'ponds', count: 16, totalArea: 1600, fenced: true}}),
            v('16 ponds, fenced, 1 gap each', {layout: GRID, water: {type: 'ponds', count: 16, totalArea: 1600, fenced: true, fenceGaps: 1}}),
            v('16 ponds, fenced, 4 gaps each', {layout: GRID, water: {type: 'ponds', count: 16, totalArea: 1600, fenced: true, fenceGaps: 4}}),
        ],
    },

    // E5. Mitigations on the grid-with-arterials city and on the barrier freeway.
    'e5-mitigation': {
        question: 'Which interventions help a bird that cannot read the map?',
        variants: [
            v('grid: nothing', {layout: GRID}),
            v('grid: calm residential (x0.3 hazard)', {layout: GRID, mitigations: [{type: 'calming', factor: 0.3}]}),
            v('grid: arterial underpasses / 200 m', {layout: GRID, mitigations: [{type: 'underpasses', spacing: 40, classes: ['arterial']}]}),
            v('grid: underpasses + drift fence', {layout: GRID, mitigations: [{type: 'underpasses', spacing: 40, classes: ['arterial'], driftFence: true}]}),
            v('grid: green corridor to water', {layout: GRID, mitigations: [{type: 'corridor', width: 8}]}),
            v('grid: calming + underpasses + fence', {layout: GRID, mitigations: [{type: 'calming', factor: 0.3},
                {type: 'underpasses', spacing: 40, classes: ['arterial'], driftFence: true}]}),
            v('freeway: barrier', {layout: FWY_BARRIER}),
            v('freeway: barrier, underpasses / 300 m', {layout: FWY_BARRIER, mitigations: [{type: 'underpasses', spacing: 60, classes: ['freeway']}]}),
            v('freeway: barrier, underpasses + drift fence', {layout: FWY_BARRIER, mitigations: [{type: 'underpasses', spacing: 60, classes: ['freeway'], driftFence: true}]}),
            v('freeway: drift fence only, no underpasses', {layout: FWY_BARRIER, mitigations: [{type: 'underpasses', positions: [], classes: ['freeway'], driftFence: true}]}),
        ],
    },

    // E6. A fixed budget of crossings: where should they go?
    'e6-placement': {
        question: 'With k crossings to spend, does siting them at roadkill hotspots beat even or random spacing?',
        variants: [0, 2, 4, 8, 16].flatMap(k => ['hotspot', 'even', 'random'].map(strategy =>
            v(`${strategy} k=${k}`, {layout: GRID},
                {placement: {strategy, budget: k, classes: ['arterial'], driftFence: true}}))),
    },

    // E7. Check against the closed form: grids without buildings, so walks are straight.
    'e7-theory': {
        question: 'Does crossing-count arithmetic predict survival when nothing blocks the straight line?',
        variants: [10, 20, 40, 80].flatMap(block => ['residential', 'arterial'].map(cls =>
            v(`${cls}, block ${block}`, {layout: {type: 'grid', block, cls, arterialEvery: 0, buildings: false}}))),
    },

    // E8. Many species, one season. Water along the east edge, so nest strips differ in
    // distance to water when nesting is clustered.
    'e8-species': {
        question: 'Do more species mean more extinctions, beyond binomial bookkeeping?',
        variants: [1, 2, 5, 10, 20, 50, 100].flatMap(n => [0, 1].map(c =>
            v(`n=${n}, clustering=${c}`, {layout: GRID, water: {type: 'coast', side: 'east', width: 20},
                species: {count: n, clustering: c}}))),
    },

    // E9. Many species over many years.
    'e9-species-years': {
        kind: 'population',
        question: 'Over 30 years, how many species persist, with and without spatial clustering?',
        variants: [1, 5, 20].flatMap(n => [0, 1].map(c =>
            v(`n=${n}, clustering=${c}`, {layout: {...GRID, arterialEvery: 0}, water: {type: 'coast', side: 'east', width: 20},
                species: {count: n, clustering: c}, population: {years: 30}}))),
    },

    // E10. Can nest-site choice evolve out of the trap? wWater is heritable; nests near
    // the shore lose more eggs to predators, so there is a real trade-off.
    'e10-evolution': {
        kind: 'population',
        question: 'Does selection move nests toward water, and fast enough to save the population?',
        variants: ['empty', 'quiet grid, calmed', 'quiet grid', 'grid + arterials'].flatMap(name => [false, true].map(evolve => {
            const layout = name === 'empty' ? {type: 'empty'} : name.startsWith('quiet grid') ? {...GRID, arterialEvery: 0} : GRID;
            const mitigations = name.endsWith('calmed') ? [{type: 'calming', factor: 0.3}] : [];
            return v(`${name}, evolve=${evolve}`, {layout, mitigations, nest: {predation: true},
                population: {years: 60, evolve, mutationSd: 0.1}});
        })),
    },

    // S1. Sensitivity: the traffic kill model is the least certain part of the model.
    's1-traffic-sensitivity': {
        question: 'How do the main comparisons change if every road is safer or deadlier?',
        variants: [0.1, 0.25, 0.5, 1, 2].flatMap(m => [
            v(`grid x${m}`, {layout: GRID, traffic: {hazardMultiplier: m}}),
            v(`suburban x${m}`, {layout: {type: 'suburban'}, traffic: {hazardMultiplier: m}}),
            v(`freeway barrier x${m}`, {layout: FWY_BARRIER, traffic: {hazardMultiplier: m}}),
        ]),
    },

    // S2. Sensitivity to the greedy navigator's two free parameters.
    's2-navigator-sensitivity': {
        question: 'Do results depend on how the greedy mama handles obstacles?',
        variants: [0, 0.35, 1].flatMap(noise => [0.25, 1, 4].map(memory =>
            v(`noise ${noise}, memory ${memory}`, {layout: {type: 'suburban'}, birds: {noise, memory}}))),
    },
};
