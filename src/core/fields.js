/**
 * Distance and cost fields computed once per world.
 *
 *   distToWater   straight-line (Euclidean) distance to the nearest water cell, ignoring
 *                 every obstacle. This is all the greedy mama "knows": which way the
 *                 water is and roughly how far.
 *   distToRoad    straight-line distance to the nearest road; the nest-site seclusion cue.
 *   oracleCost    the least possible -log(survival) for one bird walking from each cell
 *                 to water, with full knowledge of the map. exp(-oracleCost) is the best
 *                 survival any navigation strategy could achieve from that cell, and
 *                 Infinity marks cells with no path to water at all.
 */

import {CROSSING, ROAD, WALL, WATER} from './world.js';

/** Felzenszwalb & Huttenlocher (2012) 1-D squared distance transform, in place. */
function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
        let s;
        for (;;) {
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            if (s <= z[k]) k--; else break;
        }
        k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
}

/** Exact Euclidean distance from every cell to the nearest cell where `mask(i)` is true. */
export function euclideanDistance(world, mask) {
    const {width: W, height: H} = world;
    const BIG = 1e20;
    const g = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = mask(i) ? 0 : BIG;
    const m = Math.max(W, H);
    const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
    for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) f[y] = g[y * W + x];
        edt1d(f, H, d, v, z);
        for (let y = 0; y < H; y++) g[y * W + x] = d[y];
    }
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) f[x] = g[y * W + x];
        edt1d(f, W, d, v, z);
        for (let x = 0; x < W; x++) g[y * W + x] = d[x];
    }
    const out = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = g[i] >= BIG / 2 ? Infinity : Math.sqrt(g[i]);
    return out;
}

/**
 * The 8 neighbours, with diagonal moves forbidden when they would cut a wall corner.
 * Moves between a CROSSING and a ROAD cell are forbidden too: an underpass runs below
 * the lanes and an overpass above them, so neither connects to the traffic beside it.
 */
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function neighbours(world, x, y, out) {
    out.length = 0;
    for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!world.inBounds(nx, ny)) continue;
        const j = world.idx(nx, ny);
        if (world.type[j] === WALL) continue;
        const a = world.type[world.idx(x, y)], b = world.type[j];
        if ((a === CROSSING && b === ROAD) || (a === ROAD && b === CROSSING)) continue;
        if (dx !== 0 && dy !== 0 &&
            (world.type[world.idx(x + dx, y)] === WALL || world.type[world.idx(x, y + dy)] === WALL)) continue;
        out.push(j);
    }
    return out;
}

/** Binary min-heap keyed on a Float64 array. */
class Heap {
    constructor() { this.items = []; this.keys = []; }
    get size() { return this.items.length; }
    push(item, key) {
        const a = this.items, k = this.keys;
        a.push(item); k.push(key);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (k[p] <= k[i]) break;
            [a[p], a[i]] = [a[i], a[p]]; [k[p], k[i]] = [k[i], k[p]];
            i = p;
        }
    }
    pop() {
        const a = this.items, k = this.keys;
        const top = a[0], topKey = k[0];
        const lastA = a.pop(), lastK = k.pop();
        if (a.length > 0) {
            a[0] = lastA; k[0] = lastK;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < a.length && k[l] < k[m]) m = l;
                if (r < a.length && k[r] < k[m]) m = r;
                if (m === i) break;
                [a[m], a[i]] = [a[i], a[m]]; [k[m], k[i]] = [k[i], k[m]];
                i = m;
            }
        }
        return [top, topKey];
    }
}

/**
 * Dijkstra outward from all water cells. Entering a cell costs -log(1 - hazard) (one
 * bird's log-survival for one tick there) plus `stepCost` per cell, so among equally
 * safe routes the oracle takes the shortest.
 */
export function oracleCost(world, stepCost = 1e-4) {
    const n = world.n;
    const cost = new Float64Array(n).fill(Infinity);
    const heap = new Heap();
    for (let i = 0; i < n; i++) if (world.type[i] === WATER) { cost[i] = 0; heap.push(i, 0); }
    const nb = [];
    while (heap.size) {
        const [i, c] = heap.pop();
        if (c > cost[i]) continue;
        const x = i % world.width, y = (i - x) / world.width;
        // Leaving neighbour j into i costs the hazard of i (moves are symmetric in
        // passability, so reversing the search is safe).
        const enter = -Math.log(1 - world.hazard[i]) + stepCost;
        for (const j of neighbours(world, x, y, nb)) {
            const nc = c + (world.type[i] === WATER ? stepCost : enter);
            if (nc < cost[j]) { cost[j] = nc; heap.push(j, nc); }
        }
    }
    return cost;
}

export function computeFields(world) {
    return {
        distToWater: euclideanDistance(world, i => world.type[i] === WATER),
        distToRoad: euclideanDistance(world, i => world.type[i] === ROAD),
        oracleCost: oracleCost(world),
    };
}
