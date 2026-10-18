# Birds in the grid

*A simulation of the walk from nest to water, and what streets, fences, and tunnels do to it*

[SCREENSHOT 1: the fenced pond, mid-season. See the list at the end of this file.]

When a goose or duck hatches, it walks to water behind its mother. Canada goslings leave the nest as soon as a day after hatching and can't fly until they're about 44 days old [1], so for their first weeks the only way to water is on foot. Some broods hatch nearly a kilometre from water [2]. The mother chooses her nest by cues that have served her kind for a very long time, like cover and distance from disturbance, and she knows which way the water lies. Nothing she inherited tells her about four lanes of traffic, a concrete median, or a chain-link fence around a retention pond.

Vehicles kill an estimated 96 million birds a year on roads in the continental US, by one estimate from collisions reported by drivers [3]. I haven't found a study that counts how many of them were broods walking to water. So to learn which streets cost these walks the most, and which fixes would help, I built an agent-based simulation, which you can run in your browser at [steveng9.github.io/BirdsInTheGrid](https://steveng9.github.io/BirdsInTheGrid/). Road ecology and urban planning are both new fields to me, and I'd welcome corrections from people who work in them.

## The model

The world is a square map 1.2 km on a side, made of 5 m cells (about one traffic lane wide). Each cell is open ground, road, wall, water, or a safe crossing under a road. Roads range from a quiet two-lane street to an eight-lane freeway, and walls are anything a bird can't walk through (buildings, fences, and the concrete jersey barriers down the middle of freeways).

Each season, 500 mothers nest at the most secluded of 20 random spots, and each nest hatches 8 ducklings (numbers loosely set for mallards for now). Then, every tick, a mother steps to the neighbouring cell that brings her closest to the nearest water as the crow flies, and her brood follows. She knows the direction of the water and nothing else about the map. Each cell she has already visited costs her a small penalty, which lets her slide along a fence until she finds its end. I'll call her the greedy mother. For comparison, an oracle mother knows the whole map and takes the safest route.

On a road, the chance of being killed crossing each lane is 1 − exp(−q a / v), where q is vehicles per second, a is the width of the strip where a tyre can hit the bird, and v is its walking speed. It uses the same two ingredients, traffic volume and how fast the animal crosses, from which Hels and Buchwald estimated the risk for amphibians crossing roads [4]. On a busy arterial (700 vehicles an hour per lane, a 0.7 m kill width, 0.4 m/s), each lane kills 29% of the birds crossing it, and a bird survives all four lanes 26% of the time. A duckling gets across only if it and its mother both survive (I count a dead mother's brood as lost), which happens 0.26 × 0.26, or about 7%, of the time.

[SCREENSHOT 2: one season on the grid with arterials, trails on, after the season ends.]

Most of these numbers are placeholders until I calibrate them against field data, so the percentages below are for comparing one map with another, and they aren't predictions for a real place. Each is an average over 20 random maps.

## A wall in the middle of the road

With no roads, 99% of ducklings reach the shore. With one road across the middle of the map (and 42% of the nests already on the water's side), 93% arrive past a residential street, 74% past a collector, and 46% past a four-lane arterial, which is the 42% who never crossed plus about 7% of the rest.

At a tenth of freeway traffic, an undivided freeway lets 54% through, and one with a jersey barrier 42%, which means no brood from the far side survives. In the simulation you can watch the mother reach the barrier and walk along the inside lane looking for its end until she is hit. Cutting four gaps in the barrier recovers only 1.5 points, because she can't see the gaps and is usually killed before she finds one.

[SCREENSHOT 3: the jersey barrier at a tenth of freeway traffic, mid-season.]

## Which street patterns are hardest to cross

[FIGURE: results/figures/e2-urban-form.png]

On a grid of quiet streets, 25% of ducklings arrive with 50 m blocks, 33% with 100 m blocks, and 36% with 200 m blocks, because the same walk crosses more streets when they're closer together. Making every fourth street a four-lane arterial drops the 100 m grid to 12.5%. A suburb of superblocks (cul-de-sacs and loops inside a frame of arterials, with sound walls and back fences) reaches 21%. The grid with arterials stays worse than the suburb at every traffic level I tried.

Southworth and Ben-Joseph traced how residential street standards evolved and shaped the American suburb [5], and Boeing found that US grid-like design declined from 1940 through the 1990s and has recovered somewhat since 2000. He ties the connected grid to less driving, lower emissions, better road safety, and more physical activity [6]. For a bird walking a straight line to water, the same connectedness means more streets to cross. I don't read that as an argument against grids (these are two stylised maps with placeholder traffic), but it's a cost that a planner weighing street patterns probably hasn't been asked to count.

## Tunnels the bird can't find

[FIGURE: results/figures/e3-navigation.png]

How much of this loss comes from the mother not knowing the map? On the grid with arterials, almost none. The oracle gets 12.4% of ducklings to water and the greedy mother 12.5%, because every route crosses the same roads. Knowing the map pays off only where a safe route exists. With tunnels under the barrier freeway every 300 m, the greedy mother gets 43% of ducklings to water (one point more than with no tunnels), while the oracle gets 99%. Add a drift fence (a low fence along the road that a walking animal follows sideways until it reaches a tunnel), and the greedy mother reaches 99% too. A crossing helps only an animal that finds it, and an animal that knows only the direction of water finds it by following a fence.

[SCREENSHOT 4: tunnels under the barrier freeway, greedy and oracle side by side.]

Road ecologists have found the same in the field. Across 50 studies, fences (with or without crossing structures) reduced road-kill by 54%, and crossing structures without fences had no detectable effect [7]. At one Florida lake, drift fences steering turtles to a culvert under a four-lane highway cut their road deaths from 11.9 to 0.09 per km per day [8].

Placement matters too. Sixteen fenced crossings on the grid's arterials raised arrivals from 12% to 13% when evenly spaced, and to 25% when placed where a pilot season (with different nests) recorded the most road deaths, which is how crossings are often sited from roadkill surveys.

## Fences around ponds

[FIGURE: results/figures/e4-water.png]

Retention ponds are stormwater ponds, built to catch runoff from roads and roofs, and they are often fenced. Ecologists have asked whether such ponds help wildlife or trap it. Sievers and colleagues found frogs laying as many eggs in more-polluted stormwater wetlands as in less-polluted ones, though tadpoles raised in more-polluted water survived less [9], and Clevenot and colleagues reviewed 25 studies of what makes these ponds traps or good breeding sites for amphibians [10]. The model asks only whether a bird can get in.

With 4 hectares of water on the grid with arterials, one central pond gets 34% of ducklings to water, four ponds 56%, and sixteen ponds 82%, because the nearest water is closer to more nests. Fence the ponds with no gaps, and all three drop to 2% or less. One 15 m gap in each fence brings the sixteen ponds back to 78%, and four gaps per fence add only two more points. A mother walking along a fence finds a gap the way she finds its end, so one gap, the cheapest fix in this post, does almost all the work.

## Can the birds adapt?

[SCREENSHOT 5: generations mode, the calmed grid with evolution, early and late.]

A mother choosing a secluded nest far from water is following a cue that no longer predicts success. Ecologists call this an ecological trap. Schlaepfer, Runge and Sherman warn that a trapped population can go extinct if it falls below a critical size before it adapts [11].

To play this out, I ran the model for 60 years. Surviving mothers return with probability 0.6, and each duckling that reaches water becomes a breeding female with probability 0.15, so a population replaces itself when about 2.7 young per female reach water (0.6 + 0.15 × 2.7 ≈ 1). Each mother also inherits a weight on nearness to water when she picks a nest, starting at zero and mutating a little in each daughter (nests near the shore lose more eggs to predators, so it has a cost).

[FIGURE: results/figures/e10-evolution.png]

On the grid with arterials, the population goes extinct in about 9 years whether or not the preference can evolve. On a grid of quiet streets, evolution stretches survival from 14 years to 19, but every run still dies out. With that grid's traffic calmed to 30% of its hazard, 5 of 30 populations survived 60 years without evolution, and 24 of 30 survived with it.

The yearly records show that the difference is time, since the preference for water rises at about the same rate in every map. On the quiet grid the population loses about 60% of its females a year, and by the time selection has raised the young per female from 1.2 to 2.2 (still short of 2.7), about five are left. On the calmed grid it loses about 10% a year, bottoms out a little above 100 females around year 30, and recovers once the young per female passes 2.7 (the U-shaped orange line on the left of the figure). It's the standard picture of evolutionary rescue [12], in which a population declining after an abrupt change persists only if it adapts fast enough. Calming traffic saved 5 of 30 populations on its own, and it slowed the decline enough for the birds' own adaptation to save 24!

## What the model leaves out

Besides the placeholder numbers and stylised layouts, broods never split, there are no curbs or storm drains (which ducklings can fall into or fail to climb), and mothers don't remember routes. The model also treats the walk itself, away from roads, as nearly free. Three studies of mallard broods found little or no cost to walking farther overland [13, 14, 15], but in Suisun Marsh, broods hatched within about 140 m of water survived the move at 75% or better, against 50% or less for broods 970 m or more away [2].

## What comes next

I'm going to replace the traffic placeholders with numbers from the field literature and switch the default bird to the Canada goose (smaller broods, with both parents guarding). Then I want to test a fence-end effect Dodd and colleagues saw in Florida [16] (after a barrier wall went up, about 73% of the remaining kills, treefrogs aside, were on the 400 m just past its end), and search directly for the best placement of a fixed number of crossings. If you work in road ecology, waterfowl biology, or street design and something here looks wrong to you, I'd like to hear about it. The code and every experiment are on [GitHub](https://github.com/steveng9/BirdsInTheGrid).

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
