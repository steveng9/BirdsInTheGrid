import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runOne} from '../src/experiment/runner.js';
import {EXPERIMENTS} from '../src/experiment/experiments.js';
import {expectedExtinct, expectedCrossings} from '../src/core/theory.js';

const run = (config, seed = 1, extra = {}) => runOne({experiment: 't', variant: 't', seed, config, ...extra}).summary;

test('same seed, same result', () => {
    const cfg = {layout: {type: 'grid', arterialEvery: 4, parkFraction: 0.15}};
    assert.deepEqual(run(cfg, 3), run(cfg, 3));
    assert.notDeepEqual(run(cfg, 3), run(cfg, 4));
});

test('with no roads nearly every duckling reaches the shore', () => {
    const s = run({layout: {type: 'empty'}});
    assert.ok(s.youngArrivalRate > 0.97, s.youngArrivalRate);
    assert.equal(s.youngRoad, 0);
});

test('a pond fenced with no gaps is unreachable (except from nests inside the fence)', () => {
    const s = run({layout: {type: 'empty'}, water: {type: 'pond', r: 15, fenced: true}});
    assert.ok(s.fracReachable < 0.01, s.fracReachable);
    assert.ok(s.youngArrivalRate < 0.01, s.youngArrivalRate);
});

test('tunnels with drift fences make a barrier freeway safe', () => {
    const s = run({layout: {type: 'freeway', median: 'barrier'},
        mitigations: [{type: 'underpasses', spacing: 60, classes: ['freeway'], driftFence: true}]});
    assert.ok(s.youngArrivalRate > 0.95, s.youngArrivalRate);
});

test('superblocks cut off by the map edge still have a street out', () => {
    const s = run({layout: {type: 'suburban'}});
    assert.equal(s.broodsTimeout, 0);
});

test('oracle never does much worse than greedy', () => {
    for (const layout of [{type: 'suburban'}, {type: 'grid', arterialEvery: 4}]) {
        const g = run({layout, birds: {nav: 'greedy'}}), o = run({layout, birds: {nav: 'oracle'}});
        assert.ok(o.youngArrivalRate > g.youngArrivalRate - 0.05, `${layout.type}: ${o.youngArrivalRate} vs ${g.youngArrivalRate}`);
    }
});

test('every experiment variant builds and runs one season', () => {
    for (const [name, e] of Object.entries(EXPERIMENTS)) {
        if (e.kind === 'population') continue;
        for (const v of e.variants) {
            const s = run({...v.config, birds: {...(v.config.birds ?? {}), mamas: 20}}, 1, {placement: v.placement});
            assert.ok(s.youngArrivalRate >= 0 && s.youngArrivalRate <= 1, `${name} / ${v.label}`);
        }
    }
});

test('closed forms', () => {
    assert.equal(expectedCrossings(100, 20, 'perpendicular'), 5);
    assert.ok(Math.abs(expectedCrossings(Math.PI * 20, 20) - 4) < 1e-12);
    assert.ok(Math.abs(expectedExtinct(10, 500, 0.1) - 10 * 0.9 ** 50) < 1e-12);
});
