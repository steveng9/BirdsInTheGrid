# Birds in the grid

*A simulation of the walk from nest to water, and what streets, fences, and tunnels do to it*

[SCREENSHOT 1: the fenced pond, mid-season. See the list at the end of this file.]

Ducklings and goslings can't fly for weeks (about 44 days, for Canada goslings [1]), so a brood that hatches away from water walks there behind its mother, sometimes for most of a kilometre [2]. In a city, that walk can cross four lanes of traffic, end at the concrete wall down the middle of a freeway, or stop at a fence around the pond it was headed for.

Vehicles kill an estimated 96 million birds a year on roads in the continental US [3], and I haven't found anyone counting how many were broods on that first walk. So I built a simulation, which runs in your browser at [steveng9.github.io/BirdsInTheGrid](https://steveng9.github.io/BirdsInTheGrid/), to ask which streets cost the walk the most and which fixes help.

## The model

The world is a 1.2 km square of 5 m cells, each of them ground, road, water, a tunnel, or a wall (a building, a fence, or a freeway's median barrier). Each season, 500 mothers nest at the most secluded of 20 random spots, hatch 8 ducklings each, and lead them one cell at a time toward the nearest water as the crow flies, which is all a mother knows about the map. When a wall is in the way, a small penalty on cells she has already visited lets her slide along it to its end, and much of what follows comes down to where that sliding happens. I'll call her the greedy mother, and compare her with an oracle mother who knows the map and takes the safest route.

Each lane kills a crossing bird with probability 1 − exp(−q a / v), where q is cars per second, a is the width a tyre can hit, and v is walking speed, the two ingredients Hels and Buchwald used to estimate road risk for amphibians [4]. On a busy arterial (700 cars an hour per lane), a brood walking at 0.4 m/s spends about 12 seconds in each lane, and two or three cars pass in that time. Each lane kills 29%, so 26% survive all four, and a duckling arrives only if its mother survives too (0.26 × 0.26, or about 7%). Most numbers are uncalibrated placeholders, so the results below (each averaged over 20 random maps) compare maps and predict nothing about a real place.

[SCREENSHOT 2: one season on the grid with arterials, trails on, after the season ends.]

## A wall in the middle of the road

With no roads, 99% of ducklings reach water. One four-lane arterial across the map drops that to 46%, almost all from the 42% of nests already on the water's side. A freeway at a tenth of its usual traffic lets 54% through, and with a concrete jersey barrier down its middle, 42%, which is exactly the broods that never had to cross. A mother who reaches the barrier slides along it, which here means down the fast lane. Four gaps in the barrier recover 1.5 points, because she doesn't know where they are and is usually hit before she reaches one.

[SCREENSHOT 3: the jersey barrier at a tenth of freeway traffic, mid-season.]

## Which street patterns are hardest to cross

[FIGURE: results/figures/e2-urban-form.png]

On a grid of quiet streets with 100 m blocks, 33% of ducklings arrive, and smaller blocks do worse. Making every fourth street a four-lane arterial drops the grid to 12.5%. A suburb of superblocks (cul-de-sacs and loops inside a frame of arterials) reaches 21%, beating the grid with arterials at every traffic level I tried.

Southworth and Ben-Joseph traced how residential street standards shaped the American suburb [5], and Boeing found that grid-like design, which goes with less driving, lower emissions, and safer roads, declined from 1940 through the 1990s and has recovered somewhat since 2000 [6]. A grid serves people on foot by offering many short routes. The bird is on foot too, but it takes only the straight one, and on a grid that line meets a street every block. Two stylised maps can't settle anything about grids, but they point to a cost planners probably haven't been asked to count.

## Tunnels the bird can't find

[FIGURE: results/figures/e3-navigation.png]

Knowing the map barely helps on the grid with arterials, where every route crosses the same roads. The oracle gets 12.4% of ducklings to water and the greedy mother 12.5% (a tenth of a point I put down to chance). With tunnels under the barrier freeway every 300 m, the oracle gets 99%, and the greedy mother 43%, one point more than with no tunnels, because she has no way of knowing there's a tunnel within 150 m. Add a drift fence (a low fence that walking animals follow sideways to a tunnel), and her sliding ends at a tunnel, so she reaches 99% too.

[SCREENSHOT 4: tunnels under the barrier freeway, greedy and oracle side by side.]

Field studies point the same way. Across 50 of them, fences cut road-kill by 54%, and crossing structures without fences had no detectable effect [7]. At one Florida lake, drift fences steering turtles to a culvert cut road deaths on each kilometre from about twelve a day to about one every eleven days [8]. In the model, sixteen fenced crossings on the arterials raised arrivals from 12% to 13% when evenly spaced, and to 25% when sited at a pilot season's worst kill spots, as real crossings often are from roadkill surveys.

## Fences around ponds

[FIGURE: results/figures/e4-water.png]

Cities often fence the ponds they build to catch stormwater. Frogs lay as many eggs in more-polluted stormwater wetlands as in less-polluted ones, though tadpoles in the more-polluted ones survive less often [9], and a review of 25 studies weighs when such ponds act as traps or good breeding sites for amphibians [10]. The model asks the earlier question of whether a bird can get in.

With 4 hectares of water on the grid with arterials, one pond gets 34% of ducklings to water and sixteen smaller ponds 82%, since scattered ponds put water near more nests. Fence them with no gaps, and both fall to 2% or less. One 15 m gap per fence brings the sixteen ponds back to 78%, because she slides along a pond fence on open ground instead of in the fast lane, and lives long enough to find the gap.

## Can the birds adapt?

[SCREENSHOT 5: generations mode, the calmed grid with evolution, early and late.]

A mother nesting far from water follows a cue (seclusion) that no longer predicts success (which ecologists call an ecological trap), and a trapped population can die out if it shrinks below a critical size before it adapts [11]. So I ran the model for 60 years and let each daughter inherit her mother's preference for nesting near water, plus a little mutation (the preference starts at zero, and nests near the shore lose more eggs to predators).

[FIGURE: results/figures/e10-evolution.png]

On the grid with arterials, the population is gone in about 9 years whether or not it evolves. On the quiet grid, evolution stretches survival from 14 years to 19, and still every run dies out. With that grid's traffic calmed to 30% of its hazard, 5 of 30 populations last 60 years without evolution, and 24 of 30 with it.

The preference rises at about the same rate on every map with roads (right panel), so the difference is time. The quiet grid loses about 60% of its females a year and is down to about five before the preference has raised their success enough to replace them. The calmed grid loses about 10% a year, bottoms out a little above 100 females, and then recovers (the solid orange line on the left), which is the standard picture of evolutionary rescue [12]. Calming traffic saved 5 of 30 populations on its own, and slowed the decline enough for the birds' own adaptation to save 24!

## What comes next

The model leaves out curbs, storm drains, and broods that split up, and treats the walk away from roads as nearly free, which three mallard studies support [13, 14, 15] and one in California's Suisun Marsh doesn't (broods hatched farther from water survived less often) [2].

I'm setting this project down for a new simulation. Whoever picks it up (possibly me) could start with field numbers for the traffic, a search for the best placement of a fixed number of crossings, and a test for the fence-end effect Dodd and colleagues saw in Florida, where after a barrier wall went up, about 73% of the remaining kills (treefrogs aside) fell on the 400 m just past its end [16]. If you work in road ecology or urban planning (both new to me) and something here looks wrong, I'd like to hear about it. The code is on [GitHub](https://github.com/steveng9/BirdsInTheGrid).

## References

[1] BioKIDS, University of Michigan. Canada goose (*Branta canadensis*). https://biokids.umich.edu/critters/Branta_canadensis

[2] Peterson, S. H., Ackerman, J. T., Hartman, C. A., Greenawalt, A. C., Casazza, M. L. and Herzog, M. P. (2024). Duckling survival increased with availability of flooded wetland habitat and decreased with salinity concentrations in a brackish marsh. *Ornithological Applications* 126(3): duae017. https://doi.org/10.1093/ornithapp/duae017. The distance and survival figures are as reported in the USGS news release "Duckling survival is higher if nests are closer to wetland habitats flooded during the summer" (29 December 2025).

[3] Rabie, P. A., Welsch, M. M., Stone, N. and Derby, C. (2024). Novel approach to estimating avian mortality from vehicle–bird collisions on U.S. roads. *Journal of Field Ornithology* 95(3): 1. https://doi.org/10.5751/JFO-00498-950301

[4] Hels, T. and Buchwald, E. (2001). The effect of road kills on amphibian populations. *Biological Conservation* 99(3): 331–340. https://doi.org/10.1016/S0006-3207(00)00215-9

[5] Southworth, M. and Ben-Joseph, E. (1995). Street standards and the shaping of suburbia. *Journal of the American Planning Association* 61(1): 65–81. https://doi.org/10.1080/01944369508975620

[6] Boeing, G. (2021). Off the grid... and back again? The recent evolution of American street network planning and design. *Journal of the American Planning Association* 87(1): 123–137. https://doi.org/10.1080/01944363.2020.1819382

[7] Rytwinski, T., Soanes, K., Jaeger, J. A. G., Fahrig, L., Findlay, C. S., Houlahan, J., van der Ree, R. and van der Grift, E. A. (2016). How effective is road mitigation at reducing road-kill? A meta-analysis. *PLoS ONE* 11(11): e0166941. https://doi.org/10.1371/journal.pone.0166941

[8] Aresco, M. J. (2005). Mitigation measures to reduce highway mortality of turtles and other herpetofauna at a north Florida lake. *Journal of Wildlife Management* 69(2): 549–560. https://doi.org/10.2193/0022-541X(2005)069[0549:MMTRHM]2.0.CO;2

[9] Sievers, M., Parris, K. M., Swearer, S. E. and Hale, R. (2018). Stormwater wetlands can function as ecological traps for urban frogs. *Ecological Applications* 28(4): 1106–1115. https://doi.org/10.1002/eap.1714

[10] Clevenot, L., Carré, C. and Pech, P. (2018). A review of the factors that determine whether stormwater ponds are ecological traps and/or high-quality breeding sites for amphibians. *Frontiers in Ecology and Evolution* 6: 40. https://doi.org/10.3389/fevo.2018.00040

[11] Schlaepfer, M. A., Runge, M. C. and Sherman, P. W. (2002). Ecological and evolutionary traps. *Trends in Ecology & Evolution* 17(10): 474–480. https://doi.org/10.1016/S0169-5347(02)02580-6

[12] Gomulkiewicz, R. and Holt, R. D. (1995). When does evolution by natural selection prevent extinction? *Evolution* 49(1): 201–207. https://doi.org/10.1111/j.1558-5646.1995.tb05971.x

[13] Talent, L. G., Jarvis, R. L. and Krapu, G. L. (1983). Survival of mallard broods in south-central North Dakota. *The Condor* 85(1): 74–78. https://doi.org/10.2307/1367893

[14] Dzus, E. H. and Clark, R. G. (1997). Overland travel, food abundance, and wetland use by mallards: relationships with offspring survival. *The Wilson Bulletin* 109(3): 504–515.

[15] Simpson, J. W., Yerkes, T., Nudds, T. D. and Smith, B. D. (2007). Effects of habitat on mallard duckling survival in the Great Lakes region. *Journal of Wildlife Management* 71(6): 1885–1891. https://doi.org/10.2193/2006-204

[16] Dodd, C. K., Barichivich, W. J. and Smith, L. L. (2004). Effectiveness of a barrier wall and culverts in reducing wildlife mortality on a heavily traveled highway in Florida. *Biological Conservation* 118(5): 619–631. https://doi.org/10.1016/j.biocon.2003.10.011

---

## Screenshots to add (not part of the post)

All from the browser view, with trails on. Leave Mothers at 500 and Seed at 1 unless noted.

1. Opening image: experiment `e4-water`, variant `1 pond, fenced`. Pause partway through the season, when mothers are ringed around the fence. A second shot of `16 ponds, fenced, 1 gap each` after the season ends would make a good pair with it.
2. The model: `e2-urban-form`, `grid 100 m + arterials`, after the season ends, so nests are coloured by outcome and the trails show the walks. Crop to include the legend.
3. The barrier: `e1-single-roads`, `freeway x0.1, jersey barrier`, paused while broods are walking along the barrier. Zoom in on a stretch of it if the browser allows.
4. Tunnels: `e3-navigation`, `freeway barrier + underpasses / greedy` and the same with `/ oracle`, both after the season ends, side by side. The greedy trails stop at the barrier, and the oracle trails bend into the tunnels.
5. Adaptation: `e10-evolution`, `quiet grid, calmed, evolve=true` (generations switches on by itself). One shot in year 1 and one near year 60, with the history chart showing. Nests should sit visibly closer to the water in the later shot. If they don't, skip this one and use the E10 figure alone.
6. Optional: a 10 to 20 second screen recording of one season on `suburban superblocks`, if Substack accepts it as a GIF or video.
