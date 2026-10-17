/**
 * Results database: one SQLite file (results/birds.sqlite) via Node's built-in
 * node:sqlite, so there is nothing to install.
 *
 *   runs    one row per (experiment, variant, seed): the season summary as columns,
 *           plus the full config and per-species counts as JSON
 *   broods  one row per mama in single-season runs
 *   years   one row per year in multi-year runs
 *
 * Re-running a variant/seed replaces its rows, so sweeps can be resumed or redone.
 */

import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const RUN_COLS = [
    'mamas', 'nestsHatched', 'youngHatched', 'youngArrived', 'broodsArrived', 'mamasSurvived',
    'mamaRoadDeaths', 'youngRoad', 'youngTransit', 'youngOrphaned', 'youngStuck', 'broodsTimeout',
    'ticks', 'meanTicksToWater', 'fracReachable', 'meanOracleSurv', 'meanStraightSurv',
    'fracStraightBlocked', 'meanDistToWater', 'youngArrivalRate', 'broodSuccessRate', 'speciesExtinct',
];

export class Store {
    constructor(path = 'results/birds.sqlite') {
        mkdirSync(dirname(path), {recursive: true});
        this.db = new DatabaseSync(path);
        this.db.exec(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY,
                experiment TEXT, variant TEXT, seed INTEGER, kind TEXT,
                ${RUN_COLS.map(c => `${c} REAL`).join(', ')},
                speciesCount INTEGER, species TEXT, extra TEXT, config TEXT, created TEXT,
                UNIQUE (experiment, variant, seed)
            );
            CREATE TABLE IF NOT EXISTS broods (
                run_id INTEGER, id INTEGER, species INTEGER, nestX INTEGER, nestY INTEGER,
                dWater REAL, dRoad REAL, status TEXT, hatched INTEGER, arrived INTEGER,
                mamaAlive INTEGER, ticks INTEGER, roadTicks INTEGER,
                deathsRoad INTEGER, deathsTransit INTEGER, deathsOrphaned INTEGER, deathsStuck INTEGER,
                oracleLogSurv REAL, straightLogSurv REAL, straightBlocked INTEGER, straightRoadCells INTEGER
            );
            CREATE TABLE IF NOT EXISTS years (
                run_id INTEGER, year INTEGER, breeders INTEGER, nextBreeders INTEGER,
                speciesAlive INTEGER, perSpecies TEXT, meanWWater REAL, meanNestDistToWater REAL,
                nestSuccess REAL, youngArrivalRate REAL, youngPerBreeder REAL
            );
            CREATE INDEX IF NOT EXISTS broods_run ON broods(run_id);
            CREATE INDEX IF NOT EXISTS years_run ON years(run_id);
        `);
    }

    /** Insert one finished run; `result` is what runner.runOne returns. */
    save(result) {
        const {experiment, variant, seed, kind, summary, broods, years, config, extra} = result;
        const old = this.db.prepare('SELECT id FROM runs WHERE experiment=? AND variant=? AND seed=?').get(experiment, variant, seed);
        this.db.exec('BEGIN');
        try {
            if (old) {
                this.db.prepare('DELETE FROM broods WHERE run_id=?').run(old.id);
                this.db.prepare('DELETE FROM years WHERE run_id=?').run(old.id);
                this.db.prepare('DELETE FROM runs WHERE id=?').run(old.id);
            }
            const cols = ['experiment', 'variant', 'seed', 'kind', ...RUN_COLS, 'speciesCount', 'species', 'extra', 'config', 'created'];
            const vals = [experiment, variant, seed, kind, ...RUN_COLS.map(c => summary[c] ?? null),
                summary.species?.length ?? null, JSON.stringify(summary.species ?? null),
                JSON.stringify(extra ?? null), JSON.stringify(config), new Date().toISOString()];
            const {lastInsertRowid: runId} = this.db.prepare(
                `INSERT INTO runs (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);
            if (broods) {
                const ins = this.db.prepare(`INSERT INTO broods VALUES (${new Array(21).fill('?').join(',')})`);
                for (const b of broods) {
                    ins.run(runId, b.id, b.species, b.nestX, b.nestY, b.dWater, fin(b.dRoad), b.status, b.hatched,
                        b.status === 'arrived' ? b.young : 0, b.mamaAlive ? 1 : 0, b.ticks, b.roadTicks,
                        b.deaths.road, b.deaths.transit, b.deaths.orphaned, b.deaths.stuck,
                        fin(b.oracleLogSurv), fin(b.straightLogSurv), b.straightBlocked ? 1 : 0, b.straightRoadCells);
                }
            }
            if (years) {
                const ins = this.db.prepare(`INSERT INTO years VALUES (${new Array(11).fill('?').join(',')})`);
                for (const y of years) {
                    ins.run(runId, y.year, y.breeders, y.nextBreeders, y.speciesAlive, JSON.stringify(y.perSpecies),
                        y.meanWWater, y.meanNestDistToWater, y.nestSuccess, y.youngArrivalRate, y.youngPerBreeder);
                }
            }
            this.db.exec('COMMIT');
        } catch (e) {
            this.db.exec('ROLLBACK');
            throw e;
        }
    }

    has(experiment, variant, seed) {
        return !!this.db.prepare('SELECT 1 FROM runs WHERE experiment=? AND variant=? AND seed=?').get(experiment, variant, seed);
    }

    /** Mean and standard error of one summary column, per variant. */
    table(experiment, metric) {
        const rows = this.db.prepare(`SELECT variant, COUNT(*) n, AVG(${metric}) mean,
            AVG(${metric}*${metric}) sq FROM runs WHERE experiment=? GROUP BY variant ORDER BY MIN(id)`).all(experiment);
        return rows.map(({variant, n, mean, sq}) => ({variant, n, mean,
            se: n > 1 ? Math.sqrt(Math.max(sq - mean * mean, 0) * n / (n - 1) / n) : null}));
    }

    close() { this.db.close(); }
}

/** SQLite has no Infinity; store null. */
const fin = (v) => Number.isFinite(v) ? v : null;
