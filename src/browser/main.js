/**
 * Browser view. Uses the same kernel as the headless runs: pick an experiment and a
 * scenario, and watch one season play out.
 */

import {Random} from '../core/rng.js';
import {makeConfig} from '../core/params.js';
import {buildWorld} from '../core/layouts.js';
import {computeFields} from '../core/fields.js';
import {Season} from '../core/season.js';
import {EXPERIMENTS} from '../experiment/experiments.js';
import {drawWorld, drawBroods, drawBars, LEGEND} from '../render/draw.js';
import {placeCrossings} from '../experiment/runner.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d');
let season = null, background = null, trails = null, playing = false;

for (const name of Object.keys(EXPERIMENTS)) {
    if (EXPERIMENTS[name].kind === 'population') continue;
    $('experiment').add(new Option(`${name}`, name));
}
function fillVariants() {
    $('variant').innerHTML = '';
    for (const v of EXPERIMENTS[$('experiment').value].variants) $('variant').add(new Option(v.label, v.label));
}
$('experiment').value = 'e2-urban-form';
fillVariants();
$('variant').value = 'grid 100 m + arterials';
$('legend').innerHTML = LEGEND.map(([c, l]) => `<span style="--c:${c}">${l}</span>`).join('');

function reset() {
    const v = EXPERIMENTS[$('experiment').value].variants.find(v => v.label === $('variant').value);
    const seed = Number($('seed').value);
    const over = structuredClone(v.config);
    over.birds = {...(over.birds ?? {}), mamas: Number($('mamas').value)};
    if ($('nav').value) over.birds.nav = $('nav').value;
    const cfg = makeConfig(over);
    if (v.placement) {
        cfg.mitigations = [...cfg.mitigations, {type: 'underpasses', classes: v.placement.classes,
            positions: placeCrossings(cfg, seed, v.placement), driftFence: !!v.placement.driftFence}];
    }
    const rng = new Random(seed);
    const world = buildWorld(cfg, rng.fork('world'));
    const fields = computeFields(world);
    season = new Season(world, fields, cfg, rng.fork('season'));
    background = drawWorld(world);
    trails = new OffscreenCanvas(world.width, world.height);
    render();
}

function render() {
    const w = season.world;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    if ($('trails').checked) ctx.drawImage(trails, 0, 0, canvas.width, canvas.height);
    drawBroods(ctx, season, canvas.width / w.width);
    const s = season.summary();
    const walking = season.active.length;
    $('stats').textContent =
        `tick              ${season.tick}\n` +
        `still walking     ${walking}\n` +
        `broods arrived    ${s.broodsArrived} / ${s.nestsHatched}\n` +
        `young arrived     ${s.youngArrived} / ${s.youngHatched}  (${(100 * s.youngArrivalRate).toFixed(1)}%)\n` +
        `young killed      ${s.youngRoad} by traffic, ${s.youngOrphaned} orphaned\n` +
        `mothers killed    ${s.mamaRoadDeaths}\n` +
        `best possible     ${(100 * s.meanOracleSurv).toFixed(1)}% per bird (oracle)`;
    drawBars($('bars'), season);
}

function tick() {
    if (playing && !season.done) {
        const t = trails.getContext('2d');
        t.fillStyle = 'rgba(42,120,214,0.10)';
        for (let k = 0; k < Number($('speed').value) && !season.done; k++) {
            season.step();
            for (const b of season.active) t.fillRect(b.x, b.y, 1, 1);
        }
        render();
        if (season.done) { playing = false; $('play').textContent = 'Play'; }
    }
    requestAnimationFrame(tick);
}

$('experiment').onchange = () => { fillVariants(); reset(); };
for (const id of ['variant', 'nav', 'seed', 'mamas']) $(id).onchange = reset;
$('reset').onclick = reset;
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('step').onclick = () => { season.step(); render(); };
$('trails').onchange = render;
reset();
requestAnimationFrame(tick);
