/**
 * World builders: road layouts, water bodies, and mitigations.
 *
 * `buildWorld(cfg, rng)` applies, in order: the road layout, the water, then each
 * mitigation, and finally computes per-cell traffic hazard. Every builder is a plain
 * function of (world, options, rng), so new layouts are one function each.
 *
 * The layouts are stylised archetypes from the urban-form literature (the gridiron,
 * the post-war curvilinear suburb with cul-de-sacs, the limited-access freeway),
 * reduced to what matters to a walking brood: where the roads are, how busy they are,
 * and where the walls are.
 */

import {World, OPEN, GREEN, ROAD, WALL, WATER, CROSSING} from './world.js';

const lanesOf = (traffic, cls) => traffic.classes[cls].lanes;

// ---------------------------------------------------------------------------------
// Road layouts
// ---------------------------------------------------------------------------------

export const LAYOUTS = {
    /** No roads at all: the natural baseline. */
    empty() {},

    /** One straight road across the world. */
    road(w, o, rng, traffic) {
        const cls = o.cls ?? 'arterial';
        const lanes = o.lanes ?? lanesOf(traffic, cls);
        const orient = o.orient ?? 'h';
        const span = orient === 'h' ? w.height : w.width;
        const at = Math.round((o.position ?? 0.5) * span - lanes / 2);
        w.road(orient, at, 0, (orient === 'h' ? w.width : w.height) - 1, cls, lanes);
    },

    /**
     * Divided freeway: two carriageways separated by a median. With `median: 'barrier'`
     * the median is a concrete (jersey) barrier, impermeable to ducklings, with
     * `medianGaps` openings. With `median: 'grass'` it is a walkable strip.
     */
    freeway(w, o, rng, traffic) {
        const lanes = lanesOf(traffic, 'freeway') / 2;
        const orient = o.orient ?? 'h';
        const span = orient === 'h' ? w.height : w.width;
        const len = orient === 'h' ? w.width : w.height;
        const medianW = o.median === 'grass' ? (o.medianWidth ?? 4) : 1;
        const at = Math.round((o.position ?? 0.5) * span - (2 * lanes + medianW) / 2);
        w.road(orient, at, 0, len - 1, 'freeway', lanes);
        w.road(orient, at + lanes + medianW, 0, len - 1, 'freeway', lanes);
        const mid = at + lanes;
        for (let b = 0; b < len; b++) {
            for (let m = 0; m < medianW; m++) {
                const [x, y] = orient === 'h' ? [b, mid + m] : [mid + m, b];
                if (o.median === 'barrier') {
                    w.set(x, y, WALL);
                } else if (o.median === 'grass') {
                    w.set(x, y, GREEN);
                } else {
                    // Undivided: the median is just more freeway.
                    w.type[w.idx(x, y)] = ROAD;
                    w.roadClass[w.idx(x, y)] = 4;
                }
            }
        }
        if (o.median === 'barrier' && o.medianGaps > 0) {
            for (let k = 0; k < o.medianGaps; k++) {
                const b = Math.round((k + 0.5) * len / o.medianGaps);
                for (let d = -1; d <= 1; d++) {
                    const [x, y] = orient === 'h' ? [b + d, mid] : [mid, b + d];
                    if (w.inBounds(x, y)) { w.type[w.idx(x, y)] = ROAD; w.roadClass[w.idx(x, y)] = 4; }
                }
            }
        }
    },

    /**
     * Gridiron: square blocks of `block` cells between streets. Every `arterialEvery`-th
     * street is an arterial. Blocks hold a building (a WALL rectangle `inset` cells in
     * from the street) unless they are parks (probability `parkFraction`).
     */
    grid(w, o, rng, traffic) {
        const block = o.block ?? 20;
        const cls = o.cls ?? 'residential';
        const every = o.arterialEvery ?? 0;
        const lanesR = lanesOf(traffic, cls), lanesA = lanesOf(traffic, 'arterial');
        // Street positions along one axis, with the road width at each.
        const streets = [];
        let pos = o.offset ?? Math.floor(block / 2), k = 0;
        while (pos < Math.max(w.width, w.height)) {
            const art = every > 0 && k % every === 0;
            const width = art ? lanesA : lanesR;
            streets.push({at: pos, width, cls: art ? 'arterial' : cls});
            pos += width + block;
            k++;
        }
        for (const s of streets) {
            if (s.at < w.height) w.road('h', s.at, 0, w.width - 1, s.cls, s.width);
            if (s.at < w.width) w.road('v', s.at, 0, w.height - 1, s.cls, s.width);
        }
        // Blocks: the spaces between consecutive streets (and the world edges).
        const edges = [0, ...streets.flatMap(s => [s.at, s.at + s.width])];
        const spans = [];
        for (let i = 0; i < edges.length; i += 2) {
            const a = edges[i], b = edges[i + 1] ?? Math.max(w.width, w.height);
            if (b > a) spans.push([a, b]);
        }
        const inset = o.inset ?? 3;
        for (const [y0, y1] of spans) {
            for (const [x0, x1] of spans) {
                if (rng.chance(o.parkFraction ?? 0)) {
                    w.fillRect(x0, y0, x1 - x0, y1 - y0, GREEN);
                } else if (o.buildings !== false) {
                    const bw = x1 - x0 - 2 * inset, bh = y1 - y0 - 2 * inset;
                    if (bw > 0 && bh > 0) w.fillRect(x0 + inset, y0 + inset, bw, bh, WALL);
                }
            }
        }
    },

    /**
     * Curvilinear suburb, reduced to a square "superblock" pattern: arterials every
     * `superblock` cells, lined with sound walls; inside each superblock a residential
     * loop street with houses and fenced back yards, cul-de-sacs pointing inward, and a
     * green open space in the middle. Gates in the back fences open with `gateProb`.
     */
    suburban(w, o, rng, traffic) {
        const S = o.superblock ?? 120;
        const lanesA = lanesOf(traffic, 'arterial'), lanesR = lanesOf(traffic, 'residential');
        const lot = o.lotDepth ?? 8;
        const inset = o.loopInset ?? 14;
        const gate = o.gateProb ?? 0.1;
        const soundWalls = o.soundWalls ?? true;
        const off = o.offset ?? Math.floor(S / 2);
        const arts = [];
        for (let p = off % S; p < Math.max(w.width, w.height); p += S) arts.push(p);
        const cells = [-S + off % S, ...arts];   // superblock origins (top-left arterial)

        for (const a of cells) {
            for (const b of cells) {
                const x0 = a + lanesA, y0 = b + lanesA;            // superblock interior
                const x1 = a + S - 1, y1 = b + S - 1;
                // Residential loop.
                const lx0 = x0 + inset, ly0 = y0 + inset, lx1 = x1 - inset - lanesR + 1, ly1 = y1 - inset - lanesR + 1;
                if (lx1 <= lx0 || ly1 <= ly0) continue;
                w.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, OPEN);
                // Inner green space.
                w.fillRect(lx0 + lanesR + lot, ly0 + lanesR + lot, lx1 - lx0 - lanesR - 2 * lot, ly1 - ly0 - lanesR - 2 * lot, GREEN);
                w.road('h', ly0, lx0, lx1 + lanesR - 1, 'residential', lanesR);
                w.road('h', ly1, lx0, lx1 + lanesR - 1, 'residential', lanesR);
                w.road('v', lx0, ly0, ly1 + lanesR - 1, 'residential', lanesR);
                w.road('v', lx1, ly0, ly1 + lanesR - 1, 'residential', lanesR);
                // Two connector streets out to the arterials (north and south), centred on
                // the part of the superblock inside the map, so a clipped superblock keeps its exits.
                const cx = Math.floor((Math.max(x0, 0) + Math.min(x1, w.width - 1)) / 2);
                w.road('v', cx, y0, ly0 - 1, 'residential', lanesR);
                w.road('v', cx, ly1 + lanesR, y1, 'residential', lanesR);
                // Cul-de-sacs from the east and west sides of the loop, pointing inward.
                const culLen = o.culLen ?? Math.floor((lx1 - lx0) / 3);
                const nCul = o.culdesacs ?? 2;
                for (let k = 0; k < nCul; k++) {
                    const cy = Math.round(ly0 + (k + 1) * (ly1 - ly0) / (nCul + 1));
                    w.road('h', cy, lx0 + lanesR, lx0 + lanesR + culLen, 'residential', lanesR);
                    w.road('h', cy, lx1 - culLen, lx1 - 1, 'residential', lanesR);
                }
                // Back fences: a ring `lot` cells inside the loop, and the sound wall along
                // the arterial side. Houses sit between street and fence.
                const fence = (xa, ya, xb, yb) => w.line(xa, ya, xb, yb, WALL,
                    (x, y) => !w.inBounds(x, y) || w.type[w.idx(x, y)] === ROAD || rng.chance(gate));
                const fx0 = lx0 + lanesR + lot, fy0 = ly0 + lanesR + lot, fx1 = lx1 - lot - 1, fy1 = ly1 - lot - 1;
                fence(fx0, fy0, fx1, fy0); fence(fx1, fy0, fx1, fy1);
                fence(fx1, fy1, fx0, fy1); fence(fx0, fy1, fx0, fy0);
                if (soundWalls) {
                    const skip = (x, y) => !w.inBounds(x, y) || w.type[w.idx(x, y)] === ROAD;
                    w.line(x0, y0, x1, y0, WALL, skip); w.line(x1, y0, x1, y1, WALL, skip);
                    w.line(x1, y1, x0, y1, WALL, skip); w.line(x0, y1, x0, y0, WALL, skip);
                }
                // Houses: 4x4 blocks every 7 cells along both sides of every residential street.
                houses(w, x0 + 1, y0 + 1, x1 - 1, y1 - 1, rng);
            }
            }
        for (const p of arts) {
            w.road('h', p, 0, w.width - 1, 'arterial', lanesA);
            w.road('v', p, 0, w.height - 1, 'arterial', lanesA);
        }
    },
};

/** Place small WALL "houses" on open cells that sit 1 cell back from a residential street. */
function houses(w, x0, y0, x1, y1, rng) {
    const isRes = (x, y) => w.inBounds(x, y) && w.type[w.idx(x, y)] === ROAD && w.roadClass[w.idx(x, y)] === 1;
    for (let y = y0; y <= y1; y += 7) {
        for (let x = x0; x <= x1; x += 7) {
            // Is there a street within 2 cells? Then build a 4x4 house here, kept off the road.
            let near = false;
            for (let d = -2; d <= 6 && !near; d++) {
                if (isRes(x + d, y - 2) || isRes(x - 2, y + d) || isRes(x + d, y + 5) || isRes(x + 5, y + d)) near = true;
            }
            if (!near) continue;
            for (let yy = y; yy < y + 4; yy++) for (let xx = x; xx < x + 4; xx++) {
                if (w.inBounds(xx, yy) && w.type[w.idx(xx, yy)] === OPEN) w.set(xx, yy, WALL);
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------------

function disc(w, cx, cy, r) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) w.set(x, y, WATER);
        }
    }
}

/** A fence ring at radius r around (cx, cy), with `gaps` openings 3 cells wide. */
function fenceRing(w, cx, cy, r, gaps, rng) {
    const gapAngles = Array.from({length: gaps}, () => rng.float(0, 2 * Math.PI));
    const nearGap = (x, y) => gapAngles.some(a =>
        Math.hypot(x - (cx + r * Math.cos(a)), y - (cy + r * Math.sin(a))) < 1.6);
    const steps = Math.max(24, Math.ceil(2 * Math.PI * r));
    let px = Math.round(cx + r), py = Math.round(cy);
    for (let k = 1; k <= steps; k++) {
        const a = 2 * Math.PI * k / steps;
        const qx = Math.round(cx + r * Math.cos(a)), qy = Math.round(cy + r * Math.sin(a));
        w.line(px, py, qx, qy, WALL, (x, y) => !w.inBounds(x, y) || nearGap(x, y)
            || w.type[w.idx(x, y)] === ROAD || w.type[w.idx(x, y)] === WATER);
        px = qx; py = qy;
    }
}

/**
 * A pond in its own small park: streets and buildings within the park are cleared, so
 * the pond's fence (if any) is the only barrier at the shore. Streets that ran through
 * the site now dead-end at the park, as they do around real retention ponds.
 */
function placePond(w, cx, cy, r, o, rng) {
    const park = r + (o.fenceOffset ?? 2) + (o.parkMargin ?? 4);
    for (let y = Math.floor(cy - park); y <= cy + park; y++) for (let x = Math.floor(cx - park); x <= cx + park; x++) {
        if (w.inBounds(x, y) && Math.hypot(x - cx, y - cy) <= park) w.set(x, y, GREEN);
    }
    disc(w, cx, cy, r);
    w.ponds.push({cx, cy, r, fenced: !!o.fenced});
    if (o.fenced) fenceRing(w, cx, cy, r + (o.fenceOffset ?? 2), o.fenceGaps ?? 0, rng);
}

export const WATERS = {
    none() {},

    /** A band along one edge of the world (a shoreline, e.g. Puget Sound). */
    coast(w, o) {
        const width = o.width ?? 20;
        const side = o.side ?? 'south';
        if (side === 'south') w.fillRect(0, w.height - width, w.width, width, WATER);
        if (side === 'north') w.fillRect(0, 0, w.width, width, WATER);
        if (side === 'east') w.fillRect(w.width - width, 0, width, w.height, WATER);
        if (side === 'west') w.fillRect(0, 0, width, w.height, WATER);
    },

    /** A meandering river across the world. Bridges are implicit: roads stop at the bank. */
    river(w, o) {
        const width = o.width ?? 8;
        const orient = o.orient ?? 'v';
        const amp = o.meander ?? 10;
        const len = orient === 'v' ? w.height : w.width;
        const span = orient === 'v' ? w.width : w.height;
        for (let b = 0; b < len; b++) {
            const c = (o.position ?? 0.5) * span + amp * Math.sin(2 * Math.PI * b / (o.wavelength ?? 160));
            for (let a = Math.round(c - width / 2); a < Math.round(c + width / 2); a++) {
                if (orient === 'v') w.set(a, b, WATER); else w.set(b, a, WATER);
            }
        }
    },

    /** One round pond, optionally fenced (stormwater retention ponds often are). */
    pond(w, o, rng) {
        placePond(w, (o.x ?? 0.5) * w.width, (o.y ?? 0.5) * w.height, o.r ?? 15, o, rng);
    },

    /**
     * `count` ponds at random, at least `minSep` cells apart. With `totalArea` the radius
     * is chosen so all ponds together cover that many cells (for SLOSS-style
     * comparisons: one large pond or several small ones of equal total area).
     */
    ponds(w, o, rng) {
        const count = o.count ?? 5;
        const r = o.totalArea ? Math.sqrt(o.totalArea / (Math.PI * count)) : (o.r ?? 6);
        const margin = r + (o.fenceOffset ?? 2) + (o.parkMargin ?? 4);
        const placed = [];
        for (let tries = 0; placed.length < count && tries < 5000; tries++) {
            const cx = rng.float(margin, w.width - margin), cy = rng.float(margin, w.height - margin);
            if (placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < 2 * margin + (o.minSep ?? 10))) continue;
            placed.push({cx, cy});
        }
        if (placed.length < count) throw new Error(`could only place ${placed.length} of ${count} ponds`);
        for (const {cx, cy} of placed) placePond(w, cx, cy, r, o, rng);
    },
};

// ---------------------------------------------------------------------------------
// Mitigations
// ---------------------------------------------------------------------------------

/** Turn the full cross-section of road segment `s` at position `p` into a safe crossing. */
function crossSection(w, s, p, width) {
    for (let q = p; q < p + width; q++) {
        for (let a = s.at - 1; a <= s.at + s.width; a++) {
            const [x, y] = s.orient === 'h' ? [q, a] : [a, q];
            if (!w.inBounds(x, y)) continue;
            const t = w.type[w.idx(x, y)];
            if (t === ROAD || t === WALL) { w.type[w.idx(x, y)] = CROSSING; w.roadClass[w.idx(x, y)] = 0; }
        }
    }
}

/** Walls along both edges of a road segment, left open at crossings and intersections. */
function driftFence(w, s, openings, width) {
    for (const a of [s.at - 1, s.at + s.width]) {
        for (let b = s.from; b <= s.to; b++) {
            // The fence meets the tunnel mouth exactly; any wider and walkers that reach
            // the opening step onto the lanes beside the tunnel instead of into it.
            if (openings.some(p => b >= p && b < p + width)) continue;
            const [x, y] = s.orient === 'h' ? [b, a] : [a, b];
            if (!w.inBounds(x, y)) continue;
            const t = w.type[w.idx(x, y)];
            if (t === OPEN || t === GREEN) w.set(x, y, WALL);
        }
    }
}

/** Merge the freeway's two carriageways (and the median between) into one segment. */
function majorSegments(w, classes) {
    const segs = w.roads.filter(s => classes.includes(s.cls)).map(s => ({...s}));
    const out = [];
    for (const s of segs.sort((a, b) => a.at - b.at)) {
        const prev = out.find(o => o.orient === s.orient && o.cls === s.cls && s.at - (o.at + o.width) <= 4);
        if (prev && s.cls === 'freeway') prev.width = s.at + s.width - prev.at;
        else out.push(s);
    }
    return out;
}

export const MITIGATIONS = {
    /**
     * Safe crossings (underpasses / culverts) every `spacing` cells along roads of the
     * given classes, or at explicit `positions` [{x, y}]. With `driftFence`, walls along
     * the roadside steer walkers to the openings, as in amphibian and turtle tunnels.
     */
    underpasses(w, o) {
        const classes = o.classes ?? ['arterial', 'freeway'];
        const width = o.width ?? 2;
        for (const s of majorSegments(w, classes)) {
            let openings = [];
            if (o.positions) {
                for (const {x, y} of o.positions) {
                    const along = s.orient === 'h' ? x : y, across = s.orient === 'h' ? y : x;
                    if (across >= s.at && across < s.at + s.width && along >= s.from && along <= s.to) openings.push(along);
                }
            } else {
                for (let p = s.from + Math.floor((o.spacing ?? 40) / 2); p <= s.to; p += o.spacing ?? 40) openings.push(p);
            }
            for (const p of openings) crossSection(w, s, p, width);
            if (o.driftFence) driftFence(w, s, openings, width);
        }
    },

    /** Scale the hazard of some road classes (lower speed limits, traffic calming). */
    calming(w, o, rng, traffic) {
        for (const cls of o.classes ?? ['residential', 'collector']) {
            traffic.classes[cls].hazardMultiplier = (traffic.classes[cls].hazardMultiplier ?? 1) * (o.factor ?? 0.3);
        }
    },

    /** A green band through the city: roads become overpasses/greenway, walls are cleared. */
    corridor(w, o) {
        const width = o.width ?? 6;
        const orient = o.orient ?? 'v';
        const span = orient === 'v' ? w.width : w.height;
        const len = orient === 'v' ? w.height : w.width;
        const at = Math.round((o.position ?? 0.5) * span - width / 2);
        for (let b = 0; b < len; b++) {
            for (let a = at; a < at + width; a++) {
                const [x, y] = orient === 'v' ? [a, b] : [b, a];
                if (!w.inBounds(x, y)) continue;
                const t = w.type[w.idx(x, y)];
                if (t === ROAD) { w.type[w.idx(x, y)] = CROSSING; w.roadClass[w.idx(x, y)] = 0; }
                else if (t === WALL || t === OPEN) w.set(x, y, GREEN);
            }
        }
    },

    /** Openings cut into every pond fence (the hole under the chain-link). */
    pondGates(w, o, rng) {
        for (const p of w.ponds.filter(p => p.fenced)) {
            const R = p.r + (o.fenceOffset ?? 2);
            for (let k = 0; k < (o.count ?? 1); k++) {
                const a = rng.float(0, 2 * Math.PI);
                const gx = p.cx + R * Math.cos(a), gy = p.cy + R * Math.sin(a);
                for (let y = Math.floor(gy - 2); y <= gy + 2; y++) for (let x = Math.floor(gx - 2); x <= gx + 2; x++) {
                    if (w.inBounds(x, y) && w.type[w.idx(x, y)] === WALL && Math.hypot(x - gx, y - gy) < 1.8) w.set(x, y, OPEN);
                }
            }
        }
    },
};

/**
 * Build a world from a full config. The rng is forked per stage so that changing one
 * stage (say, adding a mitigation) never reshuffles the random draws of another.
 */
export function buildWorld(cfg, rng) {
    const w = new World(cfg.world.width, cfg.world.height);
    const traffic = structuredClone(cfg.traffic);
    const layout = LAYOUTS[cfg.layout.type];
    if (!layout) throw new Error(`unknown layout '${cfg.layout.type}'`);
    layout(w, cfg.layout, rng.fork('layout'), traffic);
    const water = WATERS[cfg.water.type];
    if (!water) throw new Error(`unknown water '${cfg.water.type}'`);
    water(w, cfg.water, rng.fork('water'));
    cfg.mitigations.forEach((m, k) => {
        const fn = MITIGATIONS[m.type];
        if (!fn) throw new Error(`unknown mitigation '${m.type}'`);
        fn(w, m, rng.fork(`mitigation${k}`), traffic);
    });
    w.computeHazard(traffic);
    return w;
}
