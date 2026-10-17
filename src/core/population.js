/**
 * Multi-year runs: the same landscape, season after season.
 *
 * Each year every breeding female runs one Season. Afterwards:
 *   - each mama that is still alive survives the year with `adultSurvival`;
 *   - each duckling that reached water becomes a breeding female next year with
 *     probability juvenileSurvival / 2 (half are male);
 *   - recruits inherit their mother's species and nest weight `wWater`, plus Gaussian
 *     mutation when `evolve` is on;
 *   - if more females than `capacity` remain, a random subset of `capacity` is kept
 *     (density dependence happens off-map, on the wintering grounds).
 *
 * The growth rate per female is roughly adultSurvival + (juvenileSurvival / 2) * young
 * reaching water. With the defaults (0.6 and 0.3) the population replaces itself when
 * about 2.7 young per female reach water, before counting mothers killed on the walk.
 */

import {Season} from './season.js';

export class Population {
    constructor(world, fields, cfg, rng) {
        this.world = world;
        this.fields = fields;
        this.cfg = cfg;
        this.rng = rng;
        this.rngDemog = rng.fork('demography');
        this.year = 0;
        const S = cfg.species.count;
        this.mamas = Array.from({length: cfg.birds.mamas}, (_, k) => ({species: k % S, wWater: cfg.nest.wWater}));
        this.history = [];
    }

    get extinct() { return this.mamas.length === 0; }

    stepYear() {
        const season = this.startYear();
        season.run();
        return this.endYear(season);
    }

    // The browser animates a season between these two calls.
    startYear() {
        return new Season(this.world, this.fields, this.cfg, this.rng.fork(`year${this.year}`), this.mamas);
    }

    endYear(season) {
        const P = this.cfg.population, r = this.rngDemog;
        const s = season.summary();
        const next = [];
        for (const b of season.broods) {
            if (b.mamaAlive && r.chance(P.adultSurvival)) next.push({species: b.species, wWater: b.wWater});
            if (b.status !== 'arrived') continue;
            for (let k = 0; k < b.young; k++) {
                if (!r.chance(P.juvenileSurvival / 2)) continue;
                const wWater = P.evolve ? Math.max(0, b.wWater + P.mutationSd * r.normal()) : b.wWater;
                next.push({species: b.species, wWater});
            }
        }
        this.mamas = next.length > P.capacity ? r.shuffle(next).slice(0, P.capacity) : next;
        this.history.push(this._record(s, season));
        this.year++;
        return s;
    }

    _record(s, season) {
        const S = this.cfg.species.count;
        const perSpecies = new Array(S).fill(0);
        for (const m of this.mamas) perSpecies[m.species]++;
        const hatched = season.broods.filter(b => b.status !== 'nestFailed');
        const mean = (xs) => xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : null;
        return {
            year: this.year,
            breeders: season.broods.length,
            nextBreeders: this.mamas.length,
            speciesAlive: perSpecies.filter(n => n > 0).length,
            perSpecies,
            meanWWater: mean(this.mamas.map(m => m.wWater)),
            meanNestDistToWater: mean(season.broods.map(b => b.dWater)),
            nestSuccess: season.broods.length ? hatched.length / season.broods.length : null,
            youngArrivalRate: s.youngArrivalRate,
            youngPerBreeder: season.broods.length ? s.youngArrived / season.broods.length : 0,
        };
    }

    run() {
        while (this.year < this.cfg.population.years && !this.extinct) this.stepYear();
        return this.history;
    }
}
