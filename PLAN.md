# Project plan

Last updated 2026-10-17.

## The question

A mother duck chooses her nest by cues that worked for millions of years: cover, distance from disturbance, a dry spot. She does not choose it by asking whether her ducklings, which cannot fly for about two months, will be able to walk from there to water. In a landscape built by people, that walk can cross four lanes of traffic, run into a chain-link fence around a stormwater pond, or end against a concrete median. The project asks how much of a bird population a street network costs, through this one mechanism, and which features of the network (road class, block size, barriers, the placement of water, crossings and gaps) decide it.

Two things Steven saw motivate the project. A pair of geese and five goslings circled a fenced retention pond beside a busy road, unable to get in, until three people dug a hole under the fence and led them through. And a mother duck and five ducklings, already halfway across a freeway, stepped into the HOV lane in front of Steven's car. The first is a wall problem and the second is a road problem, and the model keeps the two apart for that reason.

## Outputs, in order

1. A working model with a browser view and headless experiments (this repository).
2. A short Substack post on the first results, for Dr. Chris Marriott to read and judge whether there is a full paper in it.
3. If so, a paper for the ALife conference or an ALife / theoretical-ecology journal.

## Requirements for the write-ups (Steven's notes)

- The post and paper should be interdisciplinary, with brief but high-quality scholarship in two fields Steven is new to: (1) urban planning, with a research thrust there (street-network form, standards, retention-pond design, crossing infrastructure), and (2) conservation biology and ecology of birds and their habitats (brood movement, road ecology, ecological traps). The tone should be modest and inviting toward those fields, and every factual claim should be checked against a source. The literature list below marks which citations have been checked and which have not.
- Short, easy-to-read Substack articles. Steven's writing guide applies.
- The first anecdote (the geese and the fence) is probably the one to open the post with. The second may be too graphic for an opening, but it is the exact case of experiment E1 (the jersey barrier).
- Keep the model as simple as the story needs. The agents move, unlike the agents in the hierarchical-trades model, and that movement is most of the model.

## The model, in one paragraph

A 1.2 km square of 5 m cells. Each cell is open ground, green space, road (with a traffic class), wall (fence, building, jersey barrier), water, or a safe crossing. 500 mothers each sample 20 candidate nest sites and pick the most secluded (far from roads, slightly preferring green cells); by default they ignore distance to water. Each hatches 8 ducklings. Every tick the mother steps to the neighbouring cell that brings her closest to the nearest water as the crow flies, with noise and a penalty for revisiting cells (which lets her slide along a fence). The brood moves with her. On a road cell each bird independently dies with the per-lane probability from the Hels and Buchwald (2001) traffic model, 1 - exp(-q a / v), with q vehicles per second, a the kill width, and v the bird's walking speed. If the mother dies, her ducklings are counted as lost. The season ends when every brood has reached water, died, or run out of time. Multi-year runs repeat the season with survival and recruitment, and can make the nest-site preference heritable.

Two reference navigators bracket the realistic one: an oracle that knows the map and takes the safest route (an upper bound for any bird), and a random walk (a lower bound).

## Experiments

| id | question | status |
|---|---|---|
| E1 | How much does one road cost, by class and median design? | run, 20 seeds |
| E2 | Which street patterns (grid at three block sizes, grid with arterials, suburban superblocks) are hardest to walk through? | run |
| E3 | How much of the loss comes from the bird not knowing the map? (greedy vs oracle vs random) | run |
| E4 | Single large pond or several small (equal total area)? Fenced or open? How many gaps? | run |
| E5 | Mitigations: traffic calming, underpasses with and without drift fences, a green corridor | run |
| E6 | With k crossings to spend, does siting them at roadkill hotspots beat even or random spacing? | run |
| E7 | Does crossing-count arithmetic (Buffon / Cauchy-Crofton) predict survival when nothing blocks the straight line? | run |
| E8 | One season, n species: are extinctions just binomial bookkeeping, or does spatial clustering change it? | run |
| E9 | Thirty years, n species, clustered or mixed nesting | run, 30 seeds |
| E10 | Can a heritable preference for nesting near water evolve fast enough to save the population? | run, 30 seeds |
| S1 | Sensitivity to the traffic kill model (x0.1 to x2) | run |
| S2 | Sensitivity to the greedy navigator's noise and memory | run |

Results so far are in [RESULTS.md](RESULTS.md).

## Angles beyond "birds die when they can't reach water"

The headline result is expected, and on its own it would not carry a paper. These are the angles where the model says something that is not obvious in advance, roughly in order of how promising they look after the first runs.

1. Walls and roads are different kinds of barrier, and the worst outcomes come from combining them. A jersey barrier in the median turns a crossing that half the birds survive (at moderate traffic) into one none survive, because the brood ends up pacing along the barrier on live lanes. Fences around ponds cost almost the entire cohort, and one gap per fence restores most of it (E1, E4).
2. The information gap. Crossing structures without fences do almost nothing for a bird that knows only the direction of water, and nearly everything for a bird that knows the map (E3: 43% vs 99% at the freeway). This matches the road-ecology meta-analysis finding that crossing structures alone have no detectable effect on road-kill while fencing does (Rytwinski et al. 2016), and the model gives a mechanism for it. The gap between the greedy and oracle navigators is a measurable "cost of the evolutionary mismatch".
3. Ecological and evolutionary traps. Nest-site cues that no longer predict success are the definition of an ecological trap (Schlaepfer et al. 2002; Robertson and Hutto 2006). E10 asks whether selection on nest choice can rescue the population (evolutionary rescue, Gomulkiewicz and Holt 1995). The first runs say yes only near the replacement threshold: on a traffic-calmed grid 24 of 30 evolving populations persisted 60 years against 5 of 30 without evolution, and on busier grids evolution only delays extinction.
4. Greedy navigation on a lattice with holes is a known problem in computer science: geographic routing with "voids" (greedy forwarding plus perimeter routing, as in GPSR, Karp and Kung 2000) and the robotics "bug" algorithms (Lumelsky and Stepanov 1987). Kleinberg's (2000) decentralized-search work is the classic ALife-adjacent framing of "agents that know only the direction to the target". This gives the paper a formal hook for ALife readers.
5. Closed-form baselines. Where walks are straight, survival follows from counting road crossings (E7, and `src/core/theory.js`). Where the simulation departs from the formula, the departure has a cause the model can name: on quiet streets, birds wander into streets that run toward the water and walk along them, spending 19 ticks on the road where a straight crossing takes 12.
6. Species and correlated risk. With species mixed in space, the number of species losing every duckling in a season matches the binomial formula n(1 - q)^(N/n). With each species nesting in its own strip of the map, losses are higher at the same total population (at 20 species, 9.3 lose every duckling against 0.85 when mixed; at 50, 26 against 13), and over 30 years only the species nesting nearest the water survive (E8, E9). The interesting claim is the second one: which species persist is decided by where they nest, not by luck.
7. Siting crossings. Sixteen fenced crossings sited at roadkill hotspots (found with a pilot season) raised arrivals from 12% to 25%; the same sixteen spaced evenly or at random reached only 13-14% (E6). An optimal-placement version (betweenness on the brood-flow graph, or a greedy set-cover) is a natural next experiment and a concrete planning recommendation.
8. SLOSS for water. Splitting a fixed pond area into 16 small ponds raised arrivals from 34% to 82% on the grid, because the nearest water gets closer. This touches the conservation-biology SLOSS debate (single large or several small; Diamond 1975, Simberloff and Abele 1976, Fahrig 2020) from a new direction.

Other ideas, not started:

- Real street networks. Import neighbourhoods from OpenStreetMap (via OSMnx; Boeing 2017) for places near Puget Sound (Tacoma, Seattle) and rasterise them. A small set of real cities would answer "is this just a toy grid?" directly.
- Curbs and storm drains. Ducklings fall through grates and cannot climb standard curbs; some cities install duckling ramps. A third barrier type (passable for the mother, not for the young) would split broods, which the model currently never does.
- Memory and philopatry. Female mallards tend to return to the area where they hatched. A mother that remembers last year's successful route, or daughters that learn from mothers, is a cultural-transmission angle that fits ALife well.
- Time of day and traffic. Most brood movement may happen at quieter hours; traffic volume could vary by tick.
- Wetland quality at the destination (fenced ponds that are reachable but poor habitat, as in the stormwater-trap literature).

## Parameter provenance

Every number in `src/core/params.js` is tagged [lit] or [placeholder]. Before any claim in a paper rests on a number, it needs a source or a sensitivity sweep.

| parameter | value | status |
|---|---|---|
| cell size | 5 m (one cell ~ one lane) | modelling choice |
| world size | 1.2 km | consistent with brood movements: one prairie study reports a mean of 350 m from nest to first wetland, with 94% of broods moving less than 1 km (source to pin down; see below) |
| brood size | 8 | [lit, to verify] mallard clutches are typically 8 to 10 |
| kill model | Hels & Buchwald (2001) form | verified that the paper models crossing risk from traffic and movement rate; the exact equation still needs to be read in the full text |
| kill width, bird speed | 0.7 m, 0.4 m/s | [placeholder] |
| traffic volumes per lane | 60 / 300 / 700 / 1800 veh/h | [placeholder]; 1800 is near freeway lane capacity [to verify] |
| greedy noise, memory | 0.35, 1.0 | [placeholder]; S2 shows results in the suburb are insensitive to both |
| adult female annual survival | 0.6 | [lit, to verify] |
| juvenile survival, water to first breeding | 0.3 | [placeholder], set so a roadless landscape grows |
| nest survival and its road / shore penalties | 0.6, 0.3, 0.4 | [placeholder]; published mallard nest success is often far lower [to verify] |

The traffic model is the least certain part. S1 shows the city-wide ordering of layouts holds from x0.1 to x2 of the default hazard, though the absolute numbers move a lot.

A known mismatch with the field literature: in roadless landscapes the model loses almost no ducklings on the walk. Field studies disagree about whether long overland moves reduce duckling survival at all (Talent et al. 1983 and Dzus and Clark 1997 found little effect; Ball et al. 1975 and Rotella and Ratti 1992 found some; a USGS study in Suisun Marsh found broods hatched within 140 m of water had a 75% or better chance of surviving the move, against 50% or less beyond 970 m). The model's `transitHazard` should be calibrated against these numbers.

## Literature

Checked in this session (title, venue and the claim used were confirmed from an abstract or a reliable summary; full texts not yet read):

- Hels, T. and Buchwald, E. (2001). The effect of road kills on amphibian populations. Biological Conservation 99: 331-340. Probability of being killed crossing: 0.34-0.61 on a road with 3,207 vehicles/day, 0.89-0.98 on a motorway.
- Rytwinski, T. et al. (2016). How effective is road mitigation at reducing road-kill? A meta-analysis. PLoS ONE. Mitigation reduces road-kill by 40% on average; fences, with or without crossing structures, by 54%; crossing structures alone showed no detectable effect.
- Rabie, P. A. et al. (2024). Journal of Field Ornithology. About 96 million birds per year killed by vehicles in the continental USA (95% CI 59-200 million).
- U.S. Fish and Wildlife Service, "Threats to birds: collisions - road vehicles": cites an estimate of 89-340 million birds per year (attributed elsewhere to Loss, Will and Marra; exact paper and year still to confirm).
- Sievers, M. et al. (2018). Stormwater wetlands can function as ecological traps for urban frogs. Ecological Applications.
- Clevenot, L., Carré, C. and Pech, P. (2018). Review of 25 studies of amphibians in stormwater ponds as traps or breeding sites. Frontiers in Ecology and Evolution 6: 40.
- Talent, L. G. et al. (1983). Condor 85: 74-78. Few ducklings and no whole broods lost during overland travel.
- Dzus, E. H. and Clark, R. G. (1997). Wilson Bulletin 109: 504-515. 52 radio-tracked mallard broods; survival in the first two weeks not related to overland distance.
- Simpson, J. W. et al. (2007). Effects of habitat on mallard duckling survival in the Great Lakes region. Journal of Wildlife Management 71(6).
- USGS Western Ecological Research Center (2025). Duckling survival higher when nests are closer to flooded wetlands (Suisun Marsh).
- Southworth, M. and Ben-Joseph, E. (1995). Street standards and the shaping of suburbia. Journal of the American Planning Association 61(1): 65-81.
- Boeing, G. (2020 preprint, arXiv:2010.04771). Off the grid... and back again? The recent evolution of American street network planning and design.

From memory, not yet checked (do not cite until verified):

- Ecological traps: Schlaepfer, Runge and Sherman (2002, TREE); Battin (2004, Conservation Biology); Robertson and Hutto (2006, Ecology).
- Road ecology: Forman and Alexander (1998, Annual Review of Ecology and Systematics); Forman et al. (2003, Road Ecology); Fahrig and Rytwinski (2009, Ecology and Society); van der Ree, Smith and Grilo, eds. (2015, Handbook of Road Ecology); Glista, DeVault and DeWoody (2009, Landscape and Urban Planning); Clevenger and Waltho (2000, 2005) on Banff crossing structures.
- Brood movement: Ball et al. (1975); Rotella and Ratti (1992, J. Wildlife Management).
- Urban form: Southworth and Ben-Joseph (1996/2003, Streets and the Shaping of Towns and Cities); Boeing (2017, OSMnx; 2019, street-network orientation and entropy).
- Urban eco-evolution: Alberti (2015, TREE, eco-evolutionary dynamics in an urbanizing planet); Alberti et al. (2017, PNAS). Marina Alberti is at UW (Urban Design and Planning), which may make her a good person to ask.
- Evolutionary rescue: Gomulkiewicz and Holt (1995, Evolution); Bell and Gonzalez (2009).
- SLOSS: Diamond (1975); Simberloff and Abele (1976); Fahrig (2020, Global Ecology and Biogeography).
- Navigation: Kleinberg (2000, Nature / STOC); Karp and Kung (2000, GPSR); Lumelsky and Stepanov (1987, bug algorithms).

## Open questions for Steven

1. Which bird is the focal species? The defaults are loosely mallard, which has the most brood data. The fence story was Canada geese, whose goslings walk farther and are guarded by both parents; that would change brood size, speed, and the orphaning rule.
2. Real places. Which neighbourhoods should the OSM import start with? The pond from the geese story, if you can find it on a map, would make a good case study (and we could check whether the hole is still there).
3. For the paper: is the centre of gravity the planning result (barriers, gaps, crossing placement) or the ALife result (information gap, evolutionary rescue)? The first runs support both; the paper probably has room for one main idea.
4. Should the browser view be hosted on GitHub Pages so the Substack post can link to a live version?
5. Is it worth contacting someone in urban ecology or road ecology early (for example at UW), as a reader or co-author, given the interdisciplinary aim?

## Next steps

1. Read the full texts of Hels and Buchwald (2001) and Rytwinski et al. (2016) and replace the traffic placeholders.
2. Calibrate `transitHazard` against the overland-survival studies above.
3. OSM import for two or three real neighbourhoods near water.
4. Optimal crossing placement (E6 extension).
5. Draft the Substack post from RESULTS.md, opening with the geese and the fence.
