/**
 * The landscape: a grid of cells, each one of a few types.
 *
 *   OPEN     habitat a brood can walk on and a mama can nest in (lawn, verge, scrub)
 *   GREEN    vegetated habitat (park, corridor); walkable, and slightly preferred for nests
 *   ROAD     walkable, but every tick on it risks each bird's life (see `hazard`)
 *   WALL     impermeable to flightless young: fences, buildings, jersey barriers
 *   WATER    the destination
 *   CROSSING a safe way across a road (underpass, culvert, overpass); walkable, no hazard
 *
 * The two kinds of human obstacle behave differently, and the model keeps them apart on
 * purpose. A road can be crossed at a price paid in lives. A wall cannot be crossed at
 * all, so its cost is the detour (and the extra time on roads the detour may force).
 */

export const OPEN = 0, GREEN = 1, ROAD = 2, WALL = 3, WATER = 4, CROSSING = 5;
export const TYPE_NAMES = ['open', 'green', 'road', 'wall', 'water', 'crossing'];

export const ROAD_CLASSES = ['none', 'residential', 'collector', 'arterial', 'freeway'];

export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.n = width * height;
        this.type = new Uint8Array(this.n);          // OPEN everywhere
        this.roadClass = new Uint8Array(this.n);     // index into ROAD_CLASSES
        this.hazard = new Float32Array(this.n);      // P(death) per bird per tick here
        // Road segments as drawn, for mitigations that act along roads.
        // {orient:'h'|'v', at, from, to, width, cls}; `at` is the first row/col.
        this.roads = [];
        this.ponds = [];                             // {cx, cy, r, fenced}
    }

    idx(x, y) { return y * this.width + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

    set(x, y, t) {
        if (!this.inBounds(x, y)) return;
        const i = this.idx(x, y);
        this.type[i] = t;
        if (t !== ROAD && t !== CROSSING) this.roadClass[i] = 0;
    }

    fillRect(x0, y0, w, h, t) {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, t);
    }

    /** Axis-aligned road. `width` cells (= lanes); later roads overwrite earlier ones. */
    road(orient, at, from, to, cls, width) {
        const c = ROAD_CLASSES.indexOf(cls);
        for (let a = at; a < at + width; a++) {
            for (let b = from; b <= to; b++) {
                const [x, y] = orient === 'h' ? [b, a] : [a, b];
                if (!this.inBounds(x, y)) continue;
                const i = this.idx(x, y);
                // A bigger road keeps its class where two roads meet.
                if (this.type[i] === ROAD && this.roadClass[i] >= c) continue;
                this.type[i] = ROAD;
                this.roadClass[i] = c;
            }
        }
        this.roads.push({orient, at, from, to, width, cls});
    }

    /** 4-connected line of cells (so nothing can slip through diagonally). */
    line(x0, y0, x1, y1, t, skip = () => false) {
        let x = x0, y = y0;
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
        let err = dx - dy;
        for (;;) {
            if (!skip(x, y)) this.set(x, y, t);
            if (x === x1 && y === y1) break;
            if (2 * err > -dy) { err -= dy; x += sx; }
            else { err += dx; y += sy; }
        }
    }

    passable(i) { return this.type[i] !== WALL; }

    count(t) {
        let k = 0;
        for (let i = 0; i < this.n; i++) if (this.type[i] === t) k++;
        return k;
    }

    /** Fill per-cell hazard from road class and the traffic model. */
    computeHazard(traffic) {
        const perClass = ROAD_CLASSES.map(cls => {
            const c = traffic.classes[cls];
            if (!c) return 0;
            const q = c.vph / 3600;
            return 1 - Math.exp(-q * traffic.killWidthM / traffic.birdSpeedMps * traffic.hazardMultiplier
                * (c.hazardMultiplier ?? 1));
        });
        this.hazardByClass = perClass;
        for (let i = 0; i < this.n; i++) {
            this.hazard[i] = this.type[i] === ROAD ? perClass[this.roadClass[i]] : 0;
        }
    }
}
