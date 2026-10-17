# Birds in the grid (long draft)

This is the full-length version of the first Substack post, kept as source material for an eventual paper (ALife, or an ecology or urban-planning venue). The published post, [substack-01-birds-in-the-grid.md](substack-01-birds-in-the-grid.md), is a shorter cut of it. Everything here beyond the post: the full E1 freeway-median results, the comparison with the straight-line crossing formula, the E5 combined fixes, the fence-end question from Dodd et al., the species experiments (E8, E9), and the longer field-study and limitations discussion. The personal anecdote that opened the earlier draft has been removed.

[SCREENSHOT 1: the fenced pond, mid-season. See the list at the end of this file.]

Waterfowl broods do what their parents did. A goose or a duck picks a nest by cues that have worked for a very long time (cover, quiet, distance from disturbance), and the young walk to water within a day or two of hatching. Canada goslings leave the nest as soon as 24 hours after hatching and can't fly until about 44 days old (BioKIDS). So for the first weeks of their lives, a brood's only way to water is on foot, behind its mother. In a landscape built by people, that walk can cross four lanes of traffic, end against a concrete median, or run into a fence around the very pond it was headed for. Vehicles kill an estimated 96 million birds a year on roads in the continental US (Rabie et al. 2024, from collisions reported by drivers). That count doesn't separate broods walking to water from everything else, and I haven't found a study that does.

The question I wanted to answer is how much of a bird population a street network costs through this one mechanism, and which features of the network decide it: the kind of road, the size of the blocks, barriers, where the water is, and fixes like tunnels and gaps in fences. To get at it, I built an agent-based simulation, which you can run in your browser at [steveng9.github.io/BirdsInTheGrid](https://steveng9.github.io/BirdsInTheGrid/). This post describes the model, the scenarios I ran, and what came out, with the road-ecology and urban-planning research each result connects to. Both fields are new to me, and I'd welcome corrections from people who work in them.

## The model

The world is a square map 1.2 km on a side, divided into 5 m cells (about one traffic lane wide). Each cell is open ground, park, road, wall, water, or a safe crossing. Roads come in four classes, from a quiet residential street to an eight-lane freeway. Walls stand for anything a bird can't walk through: buildings, fences, sound walls, and the concrete jersey barriers that divide freeways. A safe crossing is an underpass or culvert under a road.

Each season, 500 mothers choose nests. A mother looks at 20 random spots and takes the most secluded one (farthest from roads, with a slight preference for park). By default she ignores how far the spot is from water, since that is the cue the experiments later test. Each nest hatches 8 ducklings. (The numbers are loosely set for mallards for now. Switching to Canada geese, with smaller broods and both parents guarding, comes with calibration.)

Then the walk begins. Every tick, the mother steps to the neighbouring cell that brings her closest to the nearest water as the crow flies, with a little noise, and the brood moves with her. She knows which way the water is and nothing else about the map. So she would walk straight into a fence and stay there, except that each cell she has already visited costs her a small penalty, which lets her slide along a fence until she finds its end. I'll call her the greedy mother.

On a road, each bird survives each lane independently, with a probability taken from a standard model in road ecology (the form Hels and Buchwald (2001) used for amphibians crossing roads). The chance of being killed crossing one lane is 1 − exp(−q a / v), where q is vehicles per second in the lane, a is the width of the strip in which a tyre can hit the bird, and v is the bird's walking speed. In words, the risk grows with traffic and with the time spent in the lane. For a busy arterial lane, at 700 vehicles an hour, a 0.7 m kill width and a walking speed of 0.4 m/s, that gives a 29% chance of death per lane, so a bird has a 26% chance of surviving all four lanes. A duckling reaches the other side only if both it and its mother survive, which is 0.26 × 0.26, or about 7%. If the mother dies, I count her remaining ducklings as lost.

A brood is done when the mother steps into water, when she or all her ducklings die, or when the season runs out. The output is the share of ducklings that reach water.

To tell how much of the loss comes from the mother not knowing the map, the model has two other navigators. The oracle knows the whole map and takes the safest route to water (an upper bound for any bird), and the random walker wanders (a lower bound).

[SCREENSHOT 2: one season on the grid with arterials, with trails on, after the season ends.]

Most of the traffic numbers are placeholders until I calibrate them against field data, so the absolute percentages below are illustrations. The model is built for comparisons: one street pattern against another, a fence with a gap against one without. Each result is an average over 20 random maps (30 for the multi-year runs), and the error bars in the figures are one standard error.

## One road, and a wall in the middle of it

With no roads, 99% of ducklings reach the shore. A single road across the middle of the map, with about 42% of the nests south of it, leaves 93% with a quiet residential street, 74% with a collector, and 46% with a four-lane arterial. The arterial number matches the arithmetic above (the 42% who hatched south of the road, plus about 7% of the rest). At full freeway traffic almost nothing crosses eight lanes, so every freeway design lands at 42%.

At a tenth of the freeway traffic, the median starts to matter. An undivided freeway lets 54% through, and a grass median 56%, because a brood can stop between the two carriageways. A jersey barrier gives 42%, which means no brood from the north side survives. In the simulation you can watch why. The greedy mother reaches the barrier, can't cross it, and walks along it on the inside lane, looking for an end, until she is hit. Cutting four gaps in the barrier recovers only 1.5 points, because a mother who can't see the gaps rarely finds one before she is killed.

[SCREENSHOT 3: the jersey barrier at a tenth of freeway traffic, mid-season.]

## Which street patterns are hardest to cross

[FIGURE: results/figures/e2-urban-form.png]

The next scenarios compare whole street networks. On a grid of quiet streets, smaller blocks are worse: 25% of ducklings arrive with 50 m blocks, 33% with 100 m blocks, and 36% with 200 m blocks. A walk of a given length crosses more streets when the streets are closer together. Making every fourth street a four-lane arterial cuts the 100 m grid to 12.5%. A suburban layout of superblocks (cul-de-sacs and loops inside a frame of arterials, with sound walls and back fences) reaches 21%. Raising or lowering every road's traffic from a tenth to double the default moves the numbers a lot (the grid from 50% to 10%, the suburb from 52% to 20%), but the grid with arterials is worse than the suburb at every level I tried.

These two patterns have a history in planning. Southworth and Ben-Joseph (1995) traced how engineering standards produced the curvilinear, cul-de-sac suburb. Boeing (2021), measuring street networks across the US, found that grid-like design declined from 1940 through the 1990s and has recovered somewhat since 2000. Boeing ties the interconnected grid to less driving and lower emissions, and to better road safety and physical activity. For a bird walking to water, the same interconnection means more streets to cross on a straight line. I don't read this as an argument against grids (the comparison is between two stylised maps, with placeholder traffic), but it's a cost that a planner weighing street patterns probably hasn't been asked to count.

One finding in these runs surprised me. On grids with no buildings, a straight walk crosses a predictable number of streets, so survival can be worked out with a formula. For arterials the simulation sits on the formula, and for quiet residential streets it falls below it, by up to 14 points with 50 m blocks. The brood records show why. On quiet streets, a mother who steps onto a street running toward the water often walks along it, since a step down the street costs her no progress. Mothers that arrived had spent 19 ticks on road cells on average, where the straight line crosses 12. On arterials the mothers who lingered on the road didn't survive, so the survivors' road time matched the straight line.

In every layout, broods mostly arrive whole or not at all, because a brood whose mother is killed is lost.

## Tunnels the bird can't find

[FIGURE: results/figures/e3-navigation.png]

The oracle navigator answers the question of how much of all this loss comes from the mother not knowing the map. On a straight shoreline with roads in between, the answer is almost none. On the grid with arterials the oracle gets 12.4% of ducklings to water and the greedy mother 12.5%, because every route crosses the same roads.

Knowing the map pays only where a safe route exists. Put tunnels under the barrier freeway every 300 m, with nothing to steer birds into them, and the greedy mother gets 43% of ducklings to water (one point more than with no tunnels at all), while the oracle gets 99%. The tunnels are there, and the mother doesn't know it. Add a drift fence, a low fence along the road that a walking bird follows sideways until it reaches a tunnel entrance, and the greedy mother reaches 99% too.

Road ecologists found the same thing in the field. A meta-analysis of 50 road-mitigation studies (Rytwinski et al. 2016) found that mitigation reduced road-kill by 40% on average, fences (with or without crossing structures) by 54%, and crossing structures without fences had no detectable effect. Drift fences are a real tool, used mostly for turtles and amphibians. At Lake Jackson in Florida, temporary drift fences steered turtles to an existing culvert under a four-lane highway, and turtle road deaths fell from 11.9 to 0.09 per km per day (Aresco 2005). On US 441 across Paynes Prairie, a barrier wall with eight culverts cut road kills from 2,411 in the year before construction to 158 in the year after, excluding treefrogs (Dodd et al. 2004). The model adds one mechanism to these findings: a crossing helps only an animal that finds it, and an animal that knows only the direction of water finds it by following a fence.

Dodd and colleagues also found that about 73% of the remaining kills were on the 400 m of road just past the end of the wall. The model's drift fence currently runs the full width of the map, so it can't show this yet. A shorter fence would test it.

A related planning question is where to put a fixed number of crossings. I placed 16 fenced crossings on the grid's arterials in three ways. Spacing them evenly raised arrivals from 12% to 13%, and placing them at random to 14%. Placing them where a pilot season (with a different set of nests) recorded the most road deaths, which is how crossings are often sited from roadkill surveys, raised arrivals to 25%. The same 16 crossings doubled the arrivals when they went where birds had died, and a natural next experiment is to search for the best placement directly.

[FIGURE: results/figures/e5-mitigation.png]

On the grid as a whole, no single fix does much. Calming residential traffic to 30% of its hazard raises arrivals from 12.5% to 14%, fenced tunnels under the arterials to 19%, and a green corridor running down the middle of the map to the water to 19%. All three together reach 25%. The grid has too many roads for any one fix to cover.

## Fences around ponds

[FIGURE: results/figures/e4-water.png]

A retention pond is a stormwater pond, built to catch runoff from roads and roofs, and it is often fenced. Ecologists have asked whether ponds like this help wildlife or trap it. Sievers et al. (2018) found that frogs laid as many eggs in polluted stormwater wetlands as in clean ones, and that tadpoles in the polluted ones survived less, which they describe as the first empirical evidence of stormwater wetlands acting as ecological traps for frogs. Clevenot et al. (2018) reviewed 25 studies of the pond features that decide whether a stormwater pond is a trap or good breeding habitat for amphibians. The model doesn't say anything about water quality. It asks the simpler question of whether a bird can get into the pond at all.

Holding the total area of water fixed at 4 hectares on the grid with arterials, one central pond gets 34% of ducklings to water, four smaller ponds get 56%, and sixteen get 82%, because the nearest water is closer to more nests. Fence the ponds with no gaps, and all three drop to 2% or less. One 15 m gap in each fence brings the sixteen ponds back to 78%, and four gaps per fence to 80%. A single gap does nearly all the work, because a mother walking along a fence finds a gap in it the same way she finds the end of it.

A gap in a fence costs almost nothing to make, and on these maps it recovers almost everything the fence costs.

## Which species persist

The next scenarios split the 500 mothers evenly among several species, with the water along one edge of the map, and count how many species lose every duckling in a season. When the species nest mixed together, the count is close to what simple probability predicts. With 50 species of 10 mothers each, and about one brood in seven succeeding, a species loses everything when all ten of its broods fail, which happens with probability 0.86^10 ≈ 0.22, so about 11 of the 50 species. The simulation lost 13. When each species nests in its own strip of the map, so that some species live much farther from water than others, losses double at the same population size (26 of 50 species). Species in the far strips fail together.

Over 30 years, this decides which species survive. A single population on a grid of quiet streets went extinct in about 16 years in 28 of 30 runs. When species nested in their own strips, the population as a whole persisted in every run, but only because the one or two species nesting nearest the water filled the map. At year 30, on average 1 of 5 species and 2.6 of 20 were left. Spatial structure saved the population and lost most of the species, and which ones survived was decided by where they nested.

## Can the birds adapt?

[SCREENSHOT 4: generations mode, the calmed grid with evolution, early and late.]

A mother choosing a secluded nest far from water is following a cue that no longer predicts success. Ecologists call this an ecological trap: an animal choosing poor habitat by cues that used to signal good habitat. Schlaepfer, Runge and Sherman (2002) describe how sudden human changes to the environment can decouple old cues from their outcomes, and they warn that a trapped population can go extinct if it falls below a critical size before it adapts. The model can play this out.

In the multi-year runs, mothers that survive the season return the next year with probability 0.6, and each duckling that reached water becomes a breeding female the next year with probability 0.15. So a population replaces itself when about 2.7 young per breeding female reach water (0.6 + 0.15 × 2.7 ≈ 1). In this experiment, each mother also carries an inherited weight on nearness to water when she picks a nest. It starts at zero and mutates a little in each daughter. There's a trade-off, too, since nests near the shore lose more eggs to predators.

[FIGURE: results/figures/e10-evolution.png]

With no roads, the population stays at capacity whether or not the preference can evolve. On the grid with arterials it goes extinct in about 9 years either way. On the grid of quiet streets, evolution extends survival from 14 years to 19, but every run still goes extinct. With the same quiet grid and traffic calmed to 30% of its hazard, 5 of 30 populations survived 60 years without evolution, and 24 of 30 survived with it. Their mean weight on nearness to water rose from 0 to about 0.7.

The yearly records explain the difference. The preference rises at about the same rate in every landscape, roughly 0.015 a year, because the mutation size sets how fast new variation appears. What differs is how long the population lasts while that happens. On the quiet grid the population loses about 60% of its females a year at first. By the time selection has raised the young per female from 1.2 to 2.2 (still short of the 2.7 needed), only about five females are left, and a bad year or two at that size ends it. On the calmed grid the population loses about 10% a year, bottoms out a little above 100 females around year 30, and recovers once the young per female passes 2.7, to about 150 females by year 60.

You can see this U-shape in the orange line on the left of the figure. It's the standard picture of evolutionary rescue, the case Gomulkiewicz and Holt (1995) modelled, in which a population declines after an abrupt change in its environment and persists only if it adapts fast enough. In the model, calming traffic by itself saved 5 of 30 populations, and it slowed the decline enough for the birds' own adaptation to save 24.

## What the model leaves out

The traffic numbers, the survival rates, and the nest-predation rates are placeholders, so none of the percentages above are predictions for a real place. The layouts are stylised grids and superblocks, not real neighbourhoods. Broods never split, there are no curbs or storm drains (both of which ducklings can fall into or fail to climb), and mothers don't remember routes from one year to the next.

The model also assumes that the walk itself, away from roads, is nearly free. Field studies disagree about that. In North Dakota, Talent et al. (1983) found that whole mallard broods were lost only in wetlands, never during overland travel. Near Yorkton, Saskatchewan, Dzus and Clark (1997) found duckling survival unrelated to how far a brood walked to its first wetland. Simpson et al. (2007), in the Great Lakes region, found little support for an effect of overland distance. But in Suisun Marsh, California, USGS researchers found that broods hatched within about 140 m of water had a 75% or better chance of surviving the move, against 50% or less for broods 970 m or more away (USGS 2025). I'll calibrate the model's cost of the walk against these numbers.

## What comes next

I'm going to replace the traffic placeholders with numbers from the field literature, switch the default bird to the Canada goose, and test the fence-end effect that Dodd and colleagues saw at Paynes Prairie. After that I want to search for the best placement of a fixed number of crossings, and run the generational mode on more landscapes to see where surviving lineages end up nesting. If you work in road ecology, waterfowl biology, or street design, and something here looks wrong to you, I'd like to hear it. The code and every experiment are on [GitHub](https://github.com/steveng9/BirdsInTheGrid).

## References

Aresco, M. J. (2005). Mitigation measures to reduce highway mortality of turtles and other herpetofauna at a north Florida lake. *Journal of Wildlife Management* 69(2): 549–560.

BioKIDS, University of Michigan. Canada goose (*Branta canadensis*). https://biokids.umich.edu/critters/Branta_canadensis

Boeing, G. (2021). Off the grid... and back again? The recent evolution of American street network planning and design. *Journal of the American Planning Association* 87(1): 123–137.

Clevenot, L., Carré, C. and Pech, P. (2018). A review of the factors that determine whether stormwater ponds are ecological traps and/or high-quality breeding sites for amphibians. *Frontiers in Ecology and Evolution* 6: 40.

Dodd, C. K., Barichivich, W. J. and Smith, L. L. (2004). Effectiveness of a barrier wall and culverts in reducing wildlife mortality on a heavily traveled highway in Florida. *Biological Conservation* 118: 619–631.

Dzus, E. H. and Clark, R. G. (1997). Overland travel, food abundance, and wetland use by mallards: relationships with offspring survival. *The Wilson Bulletin* 109(3): 504–515.

Gomulkiewicz, R. and Holt, R. D. (1995). When does evolution by natural selection prevent extinction? *Evolution* 49: 201–207.

Hels, T. and Buchwald, E. (2001). The effect of road kills on amphibian populations. *Biological Conservation* 99(3): 331–340.

Rabie, P. A., Welsch, M. M., Stone, N. and Derby, C. (2024). Novel approach to estimating avian mortality from vehicle-bird collisions on U.S. roads. *Journal of Field Ornithology* 95(3): 1.

Rytwinski, T., Soanes, K., Jaeger, J. A. G., Fahrig, L., Findlay, C. S., Houlahan, J., van der Ree, R. and van der Grift, E. A. (2016). How effective is road mitigation at reducing road-kill? A meta-analysis. *PLoS ONE* 11(11): e0166941.

Schlaepfer, M. A., Runge, M. C. and Sherman, P. W. (2002). Ecological and evolutionary traps. *Trends in Ecology & Evolution* 17(10): 474–480.

Sievers, M., Parris, K. M., Swearer, S. E. and Hale, R. (2018). Stormwater wetlands can function as ecological traps for urban frogs. *Ecological Applications*. doi:10.1002/eap.1714.

Simpson, J. W., Yerkes, T., Nudds, T. D. and Smith, B. D. (2007). Effects of habitat on mallard duckling survival in the Great Lakes region. *Journal of Wildlife Management* 71(6): 1885–1891.

Southworth, M. and Ben-Joseph, E. (1995). Street standards and the shaping of suburbia. *Journal of the American Planning Association* 61(1): 65–81.

Talent, L. G., Jarvis, R. L. and Krapu, G. L. (1983). Survival of mallard broods in south-central North Dakota. *The Condor* 85(1): 74–78.

U.S. Geological Survey, Western Ecological Research Center (2025). Duckling survival higher if nests are closer to wetland habitats flooded during brood rearing (news release).

---

## Screenshots to add (not part of the post)

All from the browser view, with trails on. Leave Mothers at 500 and Seed at 1 unless noted.

1. Opening image: experiment `e4-water`, variant `1 pond, fenced`. Pause partway through the season, when mothers are ringed around the fence. A second shot of `16 ponds, fenced, 1 gap each` after the season ends would make a good pair with it.
2. The model: `e2-urban-form`, `grid 100 m + arterials`, after the season ends, so nests are coloured by outcome and the trails show the walks. Crop to include the legend.
3. The barrier: `e1-single-roads`, `freeway x0.1, jersey barrier`, paused while broods are walking along the barrier. Zoom in on a stretch of it if the browser allows.
4. Tunnels: `e3-navigation`, `freeway barrier + underpasses / greedy` and the same with `/ oracle`, both after the season ends, side by side. The greedy trails stop at the barrier, and the oracle trails bend into the tunnels.
5. Adaptation: `e10-evolution`, `quiet grid, calmed, evolve=true` (generations switches on by itself). One shot in year 1 and one near year 60, with the history chart showing. Nests should sit visibly closer to the water in the later shot. If they don't, skip this one and use the E10 figure alone.
6. Optional: a 10 to 20 second screen recording of one season on `suburban superblocks`, if Substack accepts it as a GIF or video.
