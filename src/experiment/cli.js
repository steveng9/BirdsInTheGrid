#!/usr/bin/env node
/**
 * Headless experiments.
 *
 *   node src/experiment/cli.js list
 *   node src/experiment/cli.js run   <experiment> [--seeds 1-10] [--force] [--workers 8]
 *   node src/experiment/cli.js all   [--seeds 1-10] [--force]
 *   node src/experiment/cli.js show  <experiment> [--metric youngArrivalRate]
 *   node src/experiment/cli.js one   <experiment> <variant label> [--seed 1]
 *
 * Results go to results/birds.sqlite. Runs already in the database are skipped
 * unless --force is given.
 */

import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {EXPERIMENTS} from './experiments.js';
import {Store} from './store.js';
import {runOne} from './runner.js';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? dflt : (args[i + 1]?.startsWith('--') || args[i + 1] === undefined ? true : args[i + 1]);
};
const seedsOf = (spec) => {
    const [a, b] = String(spec).split('-').map(Number);
    return Array.from({length: (b ?? a) - a + 1}, (_, k) => a + k);
};

function jobsFor(name, seeds) {
    const exp = EXPERIMENTS[name];
    if (!exp) throw new Error(`unknown experiment '${name}'. Try: list`);
    return exp.variants.flatMap(v => seeds.map(seed => ({
        experiment: name, variant: v.label, seed, kind: exp.kind ?? 'season',
        config: v.config, placement: v.placement,
    })));
}

async function sweep(jobs, store, {force, workers}) {
    const todo = force ? jobs : jobs.filter(j => !store.has(j.experiment, j.variant, j.seed));
    console.log(`${jobs.length} runs, ${todo.length} to do, ${workers} workers`);
    if (todo.length === 0) return;
    const t0 = Date.now();
    let next = 0, done = 0, failed = 0;
    await new Promise((resolve) => {
        const pool = Array.from({length: Math.min(workers, todo.length)}, () =>
            new Worker(new URL('./worker.js', import.meta.url)));
        const feed = (w) => {
            if (next < todo.length) w.postMessage(todo[next++]);
            else { w.terminate(); if (done + failed === todo.length) resolve(); }
        };
        for (const w of pool) {
            w.on('message', (msg) => {
                if (msg.ok) { store.save(msg.result); done++; }
                else { failed++; console.error(`FAILED ${msg.job.experiment} / ${msg.job.variant} / ${msg.job.seed}\n${msg.error}`); }
                if ((done + failed) % 20 === 0 || done + failed === todo.length) {
                    process.stdout.write(`\r  ${done + failed}/${todo.length}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
                }
                feed(w);
            });
            feed(w);
        }
    });
    console.log(`\n  done in ${((Date.now() - t0) / 1000).toFixed(1)} s${failed ? `, ${failed} FAILED` : ''}`);
}

function show(store, name, metric) {
    console.log(`\n${name}: ${EXPERIMENTS[name].question}\n  metric: ${metric}`);
    for (const r of store.table(name, metric)) {
        const se = r.se == null ? '' : ` ± ${r.se.toFixed(3)}`;
        console.log(`  ${r.variant.padEnd(48)} ${r.mean == null ? '   -' : r.mean.toFixed(3)}${se}  (n=${r.n})`);
    }
}

const cmd = args[0];
const workers = Number(flag('workers', Math.max(1, availableParallelism() - 1)));
const seeds = seedsOf(flag('seeds', '1-10'));
const force = !!flag('force', false);

if (cmd === 'list' || !cmd) {
    for (const [name, e] of Object.entries(EXPERIMENTS)) {
        console.log(`${name.padEnd(26)} ${String(e.variants.length).padStart(3)} variants  ${e.kind ?? 'season'}  ${e.question}`);
    }
} else if (cmd === 'run' || cmd === 'all') {
    const names = cmd === 'all' ? Object.keys(EXPERIMENTS) : args[1].split(',');
    const store = new Store();
    for (const name of names) {
        console.log(`\n== ${name}`);
        await sweep(jobsFor(name, seeds), store, {force, workers});
    }
    store.close();
} else if (cmd === 'show') {
    const store = new Store();
    show(store, args[1], flag('metric', 'youngArrivalRate'));
    store.close();
} else if (cmd === 'one') {
    const v = EXPERIMENTS[args[1]].variants.find(v => v.label === args[2]);
    const r = runOne({experiment: args[1], variant: v.label, seed: Number(flag('seed', 1)),
        kind: EXPERIMENTS[args[1]].kind ?? 'season', config: v.config, placement: v.placement});
    const {species, ...s} = r.summary;
    console.log(r.years ? r.years : s);
} else {
    console.error(`unknown command '${cmd}'`);
    process.exit(1);
}
