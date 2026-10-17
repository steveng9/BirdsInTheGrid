/**
 * Browser view. Uses the same kernel as the headless runs: pick an experiment and a
 * scenario, and watch one season play out, or (with "generations" on) one season after
 * another, where the survivors and their young nest again the next year.
 */

import {Random} from '../core/rng.js';
import {makeConfig} from '../core/params.js';
import {buildWorld} from '../core/layouts.js';
import {computeFields} from '../core/fields.js';
import {Season} from '../core/season.js';
import {Population} from '../core/population.js';
import {EXPERIMENTS} from '../experiment/experiments.js';
import {drawWorld, drawBroods, drawBars, drawHistory, LEGEND} from '../render/draw.js';
import {placeCrossings} from '../experiment/runner.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d');
// `paused` is the user's choice and survives restarts and scenario changes, so a new
// scenario starts running straight away unless the user paused it.
let season = null, pop = null, background = null, trails = null, paused = false;

for (const name of Object.keys(EXPERIMENTS)) $('experiment').add(new Option(name, name));
function fillVariants() {
    $('variant').innerHTML = '';
    const e = EXPERIMENTS[$('experiment').value];
    for (const v of e.variants) $('variant').add(new Option(v.label, v.label));
    // Multi-year experiments open in generations mode with their own settings.
    if (e.kind === 'population') $('generations').checked = true;
}
function syncVariant() {
    const v = currentVariant();
    if (v.config.population?.evolve !== undefined) $('evolve').checked = v.config.population.evolve;
    if (v.config.population?.years) $('years').value = v.config.population.years;
}
const currentVariant = () => EXPERIMENTS[$('experiment').value].variants.find(v => v.label === $('variant').value);
$('experiment').value = 'e2-urban-form';
fillVariants();
$('variant').value = 'grid 100 m + arterials';
$('legend').innerHTML = LEGEND.map(([c, l]) => `<span style="--c:${c}">${l}</span>`).join('');

function reset() {
    const v = currentVariant();
    const seed = Number($('seed').value);
    const over = structuredClone(v.config);
    over.birds = {...(over.birds ?? {}), mamas: Number($('mamas').value)};
    if ($('nav').value) over.birds.nav = $('nav').value;
    over.population = {...(over.population ?? {}), evolve: $('evolve').checked, years: Number($('years').value)};
    const cfg = makeConfig(over);
    if (v.placement) {
        cfg.mitigations = [...cfg.mitigations, {type: 'underpasses', classes: v.placement.classes,
            positions: placeCrossings(cfg, seed, v.placement), driftFence: !!v.placement.driftFence}];
    }
    const rng = new Random(seed);
    const world = buildWorld(cfg, rng.fork('world'));
    const fields = computeFields(world);
    if ($('generations').checked) {
        pop = new Population(world, fields, cfg, rng.fork('population'));
        season = pop.startYear();
    } else {
        pop = null;
        season = new Season(world, fields, cfg, rng.fork('season'));
    }
    background = drawWorld(world);
    trails = new OffscreenCanvas(world.width, world.height);
    $('history-box').hidden = !pop;
    render();
}

// End of a season in generations mode: breed, then start the next year on the same map.
function nextYear() {
    pop.endYear(season);
    if (pop.extinct || pop.year >= pop.cfg.population.years) return false;
    season = pop.startYear();
    trails.getContext('2d').clearRect(0, 0, trails.width, trails.height);
    return true;
}

const finished = () => season.done && (!pop || pop.extinct || pop.year >= pop.cfg.population.years);

function render() {
    const w = season.world;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    if ($('trails').checked) ctx.drawImage(trails, 0, 0, canvas.width, canvas.height);
    drawBroods(ctx, season, canvas.width / w.width);
    const s = season.summary();
    $('stats').textContent =
        `tick              ${season.tick}\n` +
        `still walking     ${season.active.length}\n` +
        `broods arrived    ${s.broodsArrived} / ${s.nestsHatched}\n` +
        `young arrived     ${s.youngArrived} / ${s.youngHatched}  (${(100 * s.youngArrivalRate).toFixed(1)}%)\n` +
        `young killed      ${s.youngRoad} by traffic, ${s.youngOrphaned} orphaned\n` +
        `mothers killed    ${s.mamaRoadDeaths}\n` +
        `best possible     ${(100 * s.meanOracleSurv).toFixed(1)}% per bird (oracle)`;
    drawBars($('bars'), season);
    if (pop) {
        const h = pop.history, last = h[h.length - 1];
        const species = pop.cfg.species.count;
        $('history-stats').textContent =
            `year              ${finished() ? pop.year : pop.year + 1} of ${pop.cfg.population.years}\n` +
            `breeding females  ${season.broods.length}` + (last ? `  (next year ${last.nextBreeders})` : '') + '\n' +
            (species > 1 && last ? `species left      ${last.speciesAlive} of ${species}\n` : '') +
            (last ? `weight on water   ${last.meanWWater?.toFixed(2) ?? '-'}  (nest choice)\n` : '') +
            (pop.extinct ? 'extinct\n' : '');
        drawHistory($('history'), h, pop.cfg.population.capacity);
    }
    $('pause').textContent = finished() ? 'Done' : paused ? 'Resume' : 'Pause';
    $('pause').disabled = finished();
}

function tick() {
    if (!paused && !finished()) {
        const t = trails.getContext('2d');
        t.fillStyle = 'rgba(42,120,214,0.10)';
        for (let k = 0; k < Number($('speed').value); k++) {
            if (season.done && !(pop && nextYear())) break;
            season.step();
            for (const b of season.active) t.fillRect(b.x, b.y, 1, 1);
        }
        render();
    }
    requestAnimationFrame(tick);
}

$('experiment').onchange = () => { fillVariants(); syncVariant(); reset(); };
$('variant').onchange = () => { syncVariant(); reset(); };
for (const id of ['nav', 'seed', 'mamas', 'generations', 'evolve', 'years']) $(id).onchange = reset;
$('restart').onclick = () => { paused = false; reset(); };
$('pause').onclick = () => { paused = !paused; render(); };
$('step').onclick = () => {
    paused = true;
    if (season.done && pop) nextYear();
    if (!season.done) season.step();
    render();
};
$('trails').onchange = render;

syncVariant();
reset();
requestAnimationFrame(tick);
