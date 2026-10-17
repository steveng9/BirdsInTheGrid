/**
 * One breeding season: every mama picks a nest, hatches a brood, and walks it to water.
 *
 * A brood is one mama and her surviving young, always on the same cell (ducklings
 * follow closely; the model does not split broods). Each tick the mama chooses a
 * neighbouring cell, the brood moves there, and every bird independently survives that
 * cell's hazard. The season ends when every brood has reached water, died, or run out
 * of time.
 *
 * How the mama chooses her next cell is the `nav` parameter:
 *
 *   greedy  The default, and the realistic one. She knows which way the water is and
 *           how far (distToWater), and steps to whichever neighbour brings her closest,
 *           plus noise and a penalty for cells she has already stood on. The penalty is
 *           what lets her slide along a fence instead of pacing in front of it forever.
 *           She knows nothing about roads, fences, or where the gaps are.
 *   oracle  She knows the whole map and follows the safest route (fields.oracleCost).
 *           Not a model of a bird; an upper bound on what any bird could do here.
 *   random  An unbiased random walk. A lower bound.
 */

import {GREEN, OPEN, ROAD, WALL, WATER} from './world.js';
import {neighbours} from './fields.js';

export const OUTCOMES = ['walking', 'arrived', 'mamaKilled', 'youngLost', 'timeout', 'nestFailed'];

export class Season {
    /**
     * @param world   World
     * @param fields  computeFields(world)
     * @param cfg     full config (makeConfig)
     * @param rng     Random
     * @param mamas   optional [{species, wWater}] (population runs); otherwise cfg.birds.mamas
     *                fresh mamas are made, assigned to species round-robin.
     */
    constructor(world, fields, cfg, rng, mamas = null) {
        this.world = world;
        this.fields = fields;
        this.cfg = cfg;
        this.rngNest = rng.fork('nest');
        this.rngWalk = rng.fork('walk');
        this.tick = 0;
        this.deathMap = new Uint32Array(world.n);   // road deaths per cell (hotspots)
        this._nb = [];
        this.trackPaths = false;   // set true to record each brood's cells (figures, browser)

        const S = cfg.species.count;
        if (!mamas) {
            mamas = Array.from({length: cfg.birds.mamas}, (_, k) => ({species: k % S, wWater: cfg.nest.wWater}));
        }
        this.habitat = [];
        for (let i = 0; i < world.n; i++) {
            const t = world.type[i];
            if ((t === OPEN || t === GREEN) && fields.distToWater[i] >= 1.5) this.habitat.push(i);
        }
        this.waterEdge = waterEdge(world);
        this.broods = mamas.map((m, id) => this._hatch(id, m));
        this.active = this.broods.filter(b => b.status === 'walking');
    }

    // -----------------------------------------------------------------------------
    // Nesting
    // -----------------------------------------------------------------------------

    /** Draw a candidate nest cell, restricted to the species' strip when clustered. */
    _candidate(species) {
        const r = this.rngNest, w = this.world, S = this.cfg.species.count;
        if (S > 1 && r.chance(this.cfg.species.clustering)) {
            const x0 = Math.floor(species * w.width / S), x1 = Math.floor((species + 1) * w.width / S);
            for (let tries = 0; tries < 200; tries++) {
                const i = this.habitat[r.int(this.habitat.length)];
                const x = i % w.width;
                if (x >= x0 && x < x1) return i;
            }
        }
        return this.habitat[r.int(this.habitat.length)];
    }

    _nestScore(i, wWater) {
        const n = this.cfg.nest, f = this.fields;
        const sec = Math.min(f.distToRoad[i], n.seclusionCap) / n.seclusionCap;
        const wat = 1 - Math.min(f.distToWater[i], n.waterCap) / n.waterCap;
        const green = this.world.type[i] === GREEN ? 1 : 0;
        return n.wSeclusion * sec + wWater * wat + n.wGreen * green + n.noise * this.rngNest.normal();
    }

    _hatch(id, mama) {
        const w = this.world, f = this.fields, n = this.cfg.nest;
        let best = -1, bestScore = -Infinity;
        for (let k = 0; k < n.candidates; k++) {
            const i = this._candidate(mama.species);
            const s = this._nestScore(i, mama.wWater);
            if (s > bestScore) { bestScore = s; best = i; }
        }
        const x = best % w.width, y = (best - x) / w.width;
        const straight = this._straightLine(x, y);
        const b = {
            id, species: mama.species, wWater: mama.wWater,
            nestX: x, nestY: y, x, y,
            dWater: f.distToWater[best], dRoad: f.distToRoad[best],
            oracleLogSurv: -f.oracleCost[best],
            straightLogSurv: straight.logSurv, straightBlocked: straight.walls > 0, straightRoadCells: straight.roadCells,
            hatched: this.cfg.birds.broodSize, young: this.cfg.birds.broodSize,
            mamaAlive: true, status: 'walking', ticks: 0, roadTicks: 0,
            deaths: {road: 0, transit: 0, orphaned: 0, stuck: 0},
            visits: new Map(),
        };
        if (n.predation) {
            const p = n.baseSurvival
                * (1 - n.roadPenalty * Math.exp(-b.dRoad / n.roadScale))
                * (1 - n.shorePenalty * Math.exp(-b.dWater / n.shoreScale));
            if (!this.rngNest.chance(p)) { b.status = 'nestFailed'; b.hatched = 0; b.young = 0; }
        }
        if (b.status === 'walking' && w.type[best] === WATER) b.status = 'arrived';
        return b;
    }

    /**
     * Hazard along the straight line from (x, y) to the nearest water cell, as if walls
     * did not exist. Used to compare the simulated walk with the closed-form expectation.
     */
    _straightLine(x, y) {
        let best = null, bd = Infinity;
        for (const [wx, wy] of this.waterEdge) {
            const d = (wx - x) ** 2 + (wy - y) ** 2;
            if (d < bd) { bd = d; best = [wx, wy]; }
        }
        const out = {logSurv: 0, walls: 0, roadCells: 0};
        if (!best) return {logSurv: -Infinity, walls: 0, roadCells: 0};
        const w = this.world;
        let cx = x, cy = y;
        const dx = Math.abs(best[0] - x), dy = Math.abs(best[1] - y);
        const sx = Math.sign(best[0] - x), sy = Math.sign(best[1] - y);
        let err = dx - dy;
        while (!(cx === best[0] && cy === best[1])) {
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; cx += sx; }
            if (e2 < dx) { err += dx; cy += sy; }
            const i = w.idx(cx, cy);
            if (w.type[i] === WALL) out.walls++;
            if (w.type[i] === ROAD) out.roadCells++;
            out.logSurv += Math.log(1 - w.hazard[i]);
        }
        return out;
    }

    // -----------------------------------------------------------------------------
    // Walking
    // -----------------------------------------------------------------------------

    get done() { return this.active.length === 0; }

    step() {
        if (this.done) return;
        this.tick++;
        const timeUp = this.tick >= this.cfg.birds.maxTicks;
        for (const b of this.active) {
            this._move(b);
            this._survive(b);
            if (b.status === 'walking' && timeUp) {
                b.status = 'timeout';
                b.deaths.stuck += b.young;
                b.young = 0;
            }
        }
        this.active = this.active.filter(b => b.status === 'walking');
    }

    run() {
        while (!this.done) this.step();
        return this.summary();
    }

    _move(b) {
        const w = this.world, f = this.fields, B = this.cfg.birds, r = this.rngWalk;
        const here = w.idx(b.x, b.y);
        const nb = neighbours(w, b.x, b.y, this._nb);
        if (nb.length === 0) return;
        let next;
        const nav = (B.nav === 'oracle' && !Number.isFinite(f.oracleCost[here])) ? 'greedy' : B.nav;
        if (nav === 'random') {
            next = nb[r.int(nb.length)];
        } else if (nav === 'oracle') {
            let bc = Infinity;
            for (const j of nb) {
                const c = f.oracleCost[j] + 1e-6 * r.next();
                if (c < bc) { bc = c; next = j; }
            }
        } else {
            let bs = Infinity;
            const onRoad = w.type[here] === ROAD;
            const hx = b.hx ?? 0, hy = b.hy ?? 0, hn = Math.hypot(hx, hy);
            for (const j of nb) {
                let s = f.distToWater[j] + B.memory * (b.visits.get(j) ?? 0) + B.noise * r.normal();
                if (!onRoad && w.type[j] === ROAD) s += B.roadAversion;
                if (B.persistence && hn) {
                    const dx = j % w.width - b.x, dy = (j - j % w.width) / w.width - b.y;
                    s += B.persistence * (1 - (dx * hx + dy * hy) / (hn * Math.hypot(dx, dy))) / 2;
                }
                if (s < bs) { bs = s; next = j; }
            }
        }
        b.visits.set(here, (b.visits.get(here) ?? 0) + 1);
        if (this.trackPaths) (b.path ??= [here]).push(next);
        const nx = next % w.width, ny = (next - nx) / w.width;
        b.hx = nx - b.x; b.hy = ny - b.y;
        b.x = nx;
        b.y = ny;
        b.ticks++;
    }

    _survive(b) {
        const w = this.world, B = this.cfg.birds, r = this.rngWalk;
        const i = w.idx(b.x, b.y);
        const h = w.hazard[i];
        if (w.type[i] === ROAD) b.roadTicks++;
        // Young first, then the mama; each bird independently.
        for (let k = b.young; k > 0; k--) {
            if (h > 0 && r.chance(h)) { b.young--; b.deaths.road++; this.deathMap[i]++; }
            else if (r.chance(B.transitHazard)) { b.young--; b.deaths.transit++; }
        }
        if ((h > 0 && r.chance(h)) || r.chance(B.mamaTransitHazard)) {
            if (h > 0) this.deathMap[i]++;
            b.mamaAlive = false;
            b.status = 'mamaKilled';
            b.deaths.orphaned += b.young;   // [placeholder] orphaned ducklings do not survive
            b.young = 0;
            return;
        }
        if (w.type[i] === WATER) { b.status = 'arrived'; return; }
        if (b.young === 0) b.status = 'youngLost';   // mama alive, brood gone; she stops
    }

    // -----------------------------------------------------------------------------
    // Results
    // -----------------------------------------------------------------------------

    summary() {
        const S = this.cfg.species.count;
        const sp = Array.from({length: S}, () => ({mamas: 0, hatched: 0, arrived: 0, broodsArrived: 0}));
        const s = {
            mamas: this.broods.length, nestsHatched: 0, youngHatched: 0, youngArrived: 0,
            broodsArrived: 0, mamasSurvived: 0, mamaRoadDeaths: 0,
            youngRoad: 0, youngTransit: 0, youngOrphaned: 0, youngStuck: 0,
            broodsTimeout: 0, ticks: this.tick, meanTicksToWater: 0,
            fracReachable: 0, meanOracleSurv: 0, meanStraightSurv: 0, fracStraightBlocked: 0,
            meanDistToWater: 0,
        };
        let tSum = 0, tN = 0;
        for (const b of this.broods) {
            sp[b.species].mamas++;
            if (b.status === 'nestFailed') continue;
            s.nestsHatched++;
            s.youngHatched += b.hatched;
            sp[b.species].hatched += b.hatched;
            if (b.status === 'arrived') {
                s.youngArrived += b.young;
                sp[b.species].arrived += b.young;
                if (b.young > 0) { s.broodsArrived++; sp[b.species].broodsArrived++; }
                tSum += b.ticks; tN++;
            }
            if (b.mamaAlive) s.mamasSurvived++;
            if (b.status === 'mamaKilled' && b.mamaAlive === false) s.mamaRoadDeaths++;
            if (b.status === 'timeout') s.broodsTimeout++;
            s.youngRoad += b.deaths.road;
            s.youngTransit += b.deaths.transit;
            s.youngOrphaned += b.deaths.orphaned;
            s.youngStuck += b.deaths.stuck;
            if (Number.isFinite(b.oracleLogSurv)) s.fracReachable++;
            s.meanOracleSurv += Math.exp(b.oracleLogSurv);
            s.meanStraightSurv += Math.exp(b.straightLogSurv);
            if (b.straightBlocked) s.fracStraightBlocked++;
            s.meanDistToWater += b.dWater;
        }
        const h = Math.max(1, s.nestsHatched);
        s.fracReachable /= h; s.meanOracleSurv /= h; s.meanStraightSurv /= h;
        s.fracStraightBlocked /= h; s.meanDistToWater /= h;
        s.meanTicksToWater = tN ? tSum / tN : null;
        s.youngArrivalRate = s.youngHatched ? s.youngArrived / s.youngHatched : 0;
        s.broodSuccessRate = s.nestsHatched ? s.broodsArrived / s.nestsHatched : 0;
        s.species = sp;
        s.speciesExtinct = sp.filter(x => x.mamas > 0 && x.arrived === 0).length;
        return s;
    }
}

/** Water cells with at least one non-water 4-neighbour. */
function waterEdge(w) {
    const out = [];
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) {
        if (w.type[w.idx(x, y)] !== WATER) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
            w.inBounds(x + dx, y + dy) && w.type[w.idx(x + dx, y + dy)] !== WATER)) out.push([x, y]);
    }
    return out;
}
