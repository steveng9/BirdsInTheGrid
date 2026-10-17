#!/usr/bin/env node
/**
 * Write one season's world, nests, outcomes and walking paths to JSON for the map
 * figures (analysis/plots.py). Usage:
 *
 *   node src/experiment/snapshot.js <experiment> "<variant label>" [seed] [out.json]
 *   node src/experiment/snapshot.js gallery      # the set of maps used in the write-up
 */

import {writeFileSync, mkdirSync} from 'node:fs';
import {Random} from '../core/rng.js';
import {makeConfig} from '../core/params.js';
import {buildWorld} from '../core/layouts.js';
import {computeFields} from '../core/fields.js';
import {Season} from '../core/season.js';
import {EXPERIMENTS} from './experiments.js';
import {placeCrossings} from './runner.js';

export function snapshot(variant, seed) {
    const cfg = makeConfig(variant.config);
    if (variant.placement) {
        cfg.mitigations = [...cfg.mitigations, {type: 'underpasses', classes: variant.placement.classes,
            positions: placeCrossings(cfg, seed, variant.placement), driftFence: !!variant.placement.driftFence}];
    }
    const rng = new Random(seed);
    const world = buildWorld(cfg, rng.fork('world'));
    const fields = computeFields(world);
    const season = new Season(world, fields, cfg, rng.fork('season'));
    season.trackPaths = true;
    const summary = season.run();
    const {species, ...s} = summary;
    return {
        width: world.width, height: world.height,
        type: Array.from(world.type), roadClass: Array.from(world.roadClass),
        broods: season.broods.map(b => ({x: b.nestX, y: b.nestY, status: b.status, arrived: b.status === 'arrived' ? b.young : 0,
            path: b.path ?? []})),
        summary: s,
    };
}

const GALLERY = [
    ['e1-single-roads', 'none'], ['e1-single-roads', 'arterial'], ['e1-single-roads', 'freeway, jersey barrier'],
    ['e2-urban-form', 'grid 100 m + arterials'], ['e2-urban-form', 'suburban superblocks'],
    ['e4-water', '16 ponds, fenced, 1 gap each'], ['e4-water', 'river (centre)'],
    ['e5-mitigation', 'grid: underpasses + drift fence'], ['e5-mitigation', 'freeway: barrier, underpasses + drift fence'],
    ['e5-mitigation', 'grid: green corridor to water'], ['e3-navigation', 'grid, fenced pond, 1 gap / greedy'],
    ['e3-navigation', 'grid, fenced pond, 1 gap / oracle'],
];

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

if (process.argv[1].endsWith('snapshot.js')) {
    const [a, b, seedArg, outArg] = process.argv.slice(2);
    mkdirSync('results/snapshots', {recursive: true});
    const list = a === 'gallery' ? GALLERY : [[a, b]];
    for (const [exp, label] of list) {
        const v = EXPERIMENTS[exp].variants.find(v => v.label === label);
        if (!v) throw new Error(`no variant '${label}' in ${exp}`);
        const out = outArg ?? `results/snapshots/${slug(exp)}--${slug(label)}.json`;
        const snap = snapshot(v, Number(seedArg ?? 1));
        writeFileSync(out, JSON.stringify({experiment: exp, variant: label, ...snap}));
        console.log(`${out}  young arriving: ${(snap.summary.youngArrivalRate * 100).toFixed(1)}%`);
    }
}
