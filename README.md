# Birds in the Grid

An agent-based model of mother birds leading flightless young from the nest to water across a landscape of roads, fences, and buildings.

A mother picks her nest by seclusion, as birds always have. She knows which way the water is. She does not know that four lanes of traffic, a concrete median, or a chain-link fence around a retention pond stand between her nest and it. The model measures how many of 500 broods reach water, and how that depends on the street network, the placement of water, and interventions such as tunnels, drift fences, and gaps in fences.

- [PLAN.md](PLAN.md): the research question, the experiments, angles for a paper, parameter provenance, literature, and open questions.
- [RESULTS.md](RESULTS.md): the first results, with figures.
- [REFERENCES.md](REFERENCES.md): checked sources, with links and what each is used for ([references.bib](references.bib) for the paper).

## Quick start

Node 22.5 or newer, no npm dependencies (SQLite and the test runner are Node built-ins). The figures need Python 3 with matplotlib and numpy.

Interactive view, online at https://steveng9.github.io/BirdsInTheGrid/, or locally (ES modules need a real HTTP server; opening `index.html` from disk will not work):

```bash
npm run serve                     # python3 -m http.server 8000
open http://localhost:8000/index.html
```

In the view, Restart rebuilds the scenario and runs it; changing a setting does the same unless you paused. With "generations" on, the surviving mothers and their young that recruit nest again the next year on the same map, and a chart shows the number of breeding females per year. The multi-year experiments (`e9`, `e10`) open in this mode.

Headless experiments:

```bash
node src/experiment/cli.js list                              # experiments and their questions
node src/experiment/cli.js run e4-water --seeds 1-20         # one experiment
node src/experiment/cli.js all --seeds 1-20                  # everything (about 40 s)
node src/experiment/cli.js show e4-water                     # mean ± s.e. per variant
node src/experiment/cli.js show e8-species --metric speciesExtinct
node src/experiment/cli.js one e1-single-roads arterial      # one run, printed
node src/experiment/cli.js prune                             # drop runs of renamed variants

node src/experiment/snapshot.js gallery                      # map snapshots for figures
python3 analysis/plots.py                                    # results/figures/*.png
python3 analysis/maps.py                                     # results/figures/maps/*.png

npm test
```

Runs are stored in `results/birds.sqlite` (not committed; regenerate with the commands above). Runs already in the database are skipped unless `--force` is given.

## The model

The world is a grid of 5 m cells, 240 x 240 (1.2 km). A cell is one of:

| type | walkable | effect |
|---|---|---|
| open, green | yes | nest habitat (green slightly preferred) |
| road | yes | each bird dies with the per-lane probability of the traffic model |
| wall | no | fences, buildings, jersey barriers |
| water | yes | the destination |
| crossing | yes | an underpass or overpass; it does not connect to the lanes beside it |

Each season:

1. Each of 500 mothers samples 20 candidate nest cells and picks the one with the highest score: distance from roads (capped at 200 m), plus a bonus for green cells, plus a weight on nearness to water (zero by default), plus noise.
2. Each brood hatches 8 ducklings.
3. Every tick, each mother steps to the neighbouring cell with the lowest score: straight-line distance to the nearest water, plus a penalty for each earlier visit to that cell, plus noise. The visit penalty is what lets her slide along a fence instead of pacing in front of it. The brood moves with her.
4. On the new cell, each bird independently survives the cell's hazard. On a road, hazard per lane is 1 - exp(-q a / v), with q vehicles per second, a the kill width, and v the bird's walking speed (the form used by Hels and Buchwald 2001). If the mother dies, the ducklings still with her are counted as lost.
5. A brood is done when the mother steps into water, when she or all her ducklings die, or when time runs out (4,000 ticks).

Two reference navigators bracket the greedy mother: `oracle` knows the map and follows the safest route (computed by Dijkstra over -log survival), and `random` walks at random.

Multi-year runs (`src/core/population.js`) repeat the season. Surviving mothers return with probability 0.6. Each duckling that reached water becomes a breeding female with probability 0.15 (juvenile survival 0.3, half of them female). New and returning females choose new nest sites by the same rule. The population is capped at 500. Optionally, the nest weight on nearness to water is inherited with mutation.

## Layout

```
src/
  core/         The kernel: no DOM, no Math.random (seeded sfc32 RNG with named substreams).
    params.js       Defaults, each tagged [lit] or [placeholder]
    world.js        Cell types and the traffic hazard
    layouts.js      Road layouts, water, and mitigations (one function each)
    fields.js       Distance transforms and the oracle's cost field
    season.js       Nesting and the walk to water
    population.js   Multi-year runs
    theory.js       Closed-form expectations
  experiment/   Experiment definitions, CLI, worker-thread sweep, SQLite store, snapshots
  render/       Canvas drawing for the browser
  browser/      Browser entry point
analysis/       Python figures
results/        figures/ (committed), birds.sqlite and snapshots/ (generated)
test/           node --test
```

The architecture follows Steven's [hierarchical trades](https://github.com/steveng9/hierarchical_trades.github.io) model: a pure kernel, swappable world builders, a headless runner, and a local results database.
