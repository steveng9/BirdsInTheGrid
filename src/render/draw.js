/** Canvas drawing for the browser view. Reads the kernel, never mutates it. */

import {OPEN, GREEN, ROAD, WALL, WATER, CROSSING} from '../core/world.js';

const ROAD_COLOURS = ['#c9c6bd', '#c9c6bd', '#a8a59c', '#827f77', '#55524c'];
const CELL = {[OPEN]: '#f3f1ea', [GREEN]: '#d4e6c8', [WALL]: '#4a4540', [WATER]: '#a9cdf0', [CROSSING]: '#eda100'};
export const STATUS = {
    walking: '#0b0b0b', arrived: '#2a78d6', mamaKilled: '#eb6834', youngLost: '#e87ba4', timeout: '#6250d6',
};
export const LEGEND = [
    [STATUS.walking, 'walking'], [STATUS.arrived, 'reached water'], [STATUS.mamaKilled, 'mother killed'],
    [STATUS.youngLost, 'all young killed'], [STATUS.timeout, 'never found water'], [CELL[CROSSING], 'safe crossing'],
    [CELL[WALL], 'wall / fence'], [ROAD_COLOURS[3], 'road'],
];

const hex = (h) => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));

/** One pixel per cell; the caller scales it up. */
export function drawWorld(world) {
    const c = new OffscreenCanvas(world.width, world.height);
    const g = c.getContext('2d');
    const img = g.createImageData(world.width, world.height);
    for (let i = 0; i < world.n; i++) {
        const t = world.type[i];
        const [r, gg, b] = hex(t === ROAD ? ROAD_COLOURS[world.roadClass[i]] : CELL[t]);
        img.data.set([r, gg, b, 255], 4 * i);
    }
    g.putImageData(img, 0, 0);
    return c;
}

/** Walking broods at their position; finished broods at their nest. Size ~ young left. */
export function drawBroods(ctx, season, scale) {
    for (const b of season.broods) {
        if (b.status === 'nestFailed') continue;
        const walking = b.status === 'walking';
        const x = (walking ? b.x : b.nestX) + 0.5, y = (walking ? b.y : b.nestY) + 0.5;
        ctx.fillStyle = STATUS[b.status];
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, walking ? 1.5 + 0.35 * b.young : 1.8, 0, 2 * Math.PI);
        ctx.fill();
    }
}

/** Outcome counts as horizontal bars. */
export function drawBars(canvas, season) {
    const g = canvas.getContext('2d');
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const counts = {};
    for (const b of season.broods) counts[b.status] = (counts[b.status] ?? 0) + 1;
    const rows = Object.keys(STATUS);
    const n = season.broods.length || 1;
    rows.forEach((k, r) => {
        const y = 6 + r * 24, w = (canvas.width - 140) * (counts[k] ?? 0) / n;
        g.fillStyle = dark ? '#c3c2b7' : '#52514e';
        g.font = '12px system-ui';
        g.fillText(LEGEND.find(([c]) => c === STATUS[k])[1], 0, y + 12);
        g.fillStyle = k === 'walking' && dark ? '#f0efec' : STATUS[k];
        g.fillRect(110, y + 2, Math.max(w, 1), 14);
        g.fillStyle = dark ? '#f0efec' : '#0b0b0b';
        g.fillText(String(counts[k] ?? 0), 116 + w, y + 13);
    });
}

/** Breeding females at the start of each year, against the cap. */
export function drawHistory(canvas, history, capacity) {
    const g = canvas.getContext('2d');
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const W = canvas.width, H = canvas.height, left = 32, bottom = H - 16, top = 6;
    g.clearRect(0, 0, W, H);
    g.font = '11px system-ui';
    g.strokeStyle = dark ? '#3a3936' : '#dedcd5';
    g.fillStyle = dark ? '#c3c2b7' : '#52514e';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(left, bottom); g.lineTo(W, bottom); g.stroke();
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(left, top); g.lineTo(W, top); g.stroke();
    g.setLineDash([]);
    g.fillText(String(capacity), 0, top + 4);
    g.fillText('0', 0, bottom + 4);
    const years = Math.max(10, history.length);
    g.fillText(`year ${years}`, W - 44, H - 2);
    const pts = [[0, history[0]?.breeders ?? 0], ...history.map((h, k) => [k + 1, h.nextBreeders])];
    if (!history.length) return;
    g.strokeStyle = '#2a78d6';
    g.lineWidth = 2;
    g.beginPath();
    pts.forEach(([x, y], k) => {
        const px = left + (W - left) * x / years, py = bottom - (bottom - top) * Math.min(y, capacity) / capacity;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.stroke();
}
