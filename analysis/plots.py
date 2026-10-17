"""Figures from results/birds.sqlite -> results/figures/*.png

    python3 analysis/plots.py

One figure per experiment (see src/experiment/experiments.js and PLAN.md), plus
brood-level histograms. Error bars are one standard error across seeds.
"""
import json
import math
import sqlite3
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "results" / "birds.sqlite"
OUT = ROOT / "results" / "figures"

# Reference categorical palette, fixed order.
C = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#e6e4dd"

plt.rcParams.update({
    "figure.facecolor": "#fcfcfb", "axes.facecolor": "#fcfcfb", "savefig.facecolor": "#fcfcfb",
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "axes.axisbelow": True, "font.size": 9, "axes.titlesize": 10,
    "axes.titleweight": "bold", "axes.titlelocation": "left", "legend.frameon": False,
    "lines.linewidth": 2,
})

db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row


def per_variant(exp, metric):
    """[(variant, mean, se, n)] in definition order."""
    rows = db.execute(f"SELECT variant, {metric} v FROM runs WHERE experiment=? ORDER BY id", (exp,)).fetchall()
    groups = defaultdict(list)
    for r in rows:
        if r["v"] is not None:
            groups[r["variant"]].append(r["v"])
    out = []
    for k, xs in groups.items():
        xs = np.array(xs, float)
        se = xs.std(ddof=1) / math.sqrt(len(xs)) if len(xs) > 1 else 0
        out.append((k, xs.mean(), se, len(xs)))
    return out


def pct(ax, axis="x"):
    fmt = matplotlib.ticker.PercentFormatter(1.0, decimals=0)
    (ax.xaxis if axis == "x" else ax.yaxis).set_major_formatter(fmt)


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / name, dpi=170, bbox_inches="tight")
    plt.close(fig)
    print("  ", name)


def hbars(exp, title, name, metric="youngArrivalRate", xlabel="ducklings reaching water", colour_of=None):
    data = per_variant(exp, metric)
    fig, ax = plt.subplots(figsize=(6.4, 0.32 * len(data) + 0.9))
    y = np.arange(len(data))[::-1]
    for yi, (label, m, se, n) in zip(y, data):
        c = colour_of(label) if colour_of else C[0]
        ax.barh(yi, m, height=0.62, color=c, xerr=se, error_kw=dict(ecolor=MUTED, lw=1, capsize=0))
        ax.text(m + se + 0.01, yi, f"{100 * m:.0f}%", va="center", fontsize=8, color=INK)
    ax.set_yticks(y, [d[0] for d in data])
    ax.set_xlim(0, 1.08)
    pct(ax)
    ax.grid(axis="y", visible=False)
    ax.set_xlabel(xlabel)
    ax.set_title(title)
    n = data[0][3]
    ax.text(0, -0.9 / (0.32 * len(data) + 0.9), f"{n} seeds x 500 mothers x 8 ducklings each; bars show 1 s.e.",
            transform=ax.transAxes, fontsize=7, color=MUTED, va="top")
    save(fig, name)


def e3():
    data = {k: (m, se) for k, m, se, _ in per_variant("e3-navigation", "youngArrivalRate")}
    lands = list(dict.fromkeys(k.split(" / ")[0] for k in data))
    navs = [("greedy", "greedy (knows direction only)", C[0]), ("oracle", "oracle (knows the map)", C[1]),
            ("random", "random walk", C[2])]
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    y = np.arange(len(lands))[::-1]
    for (nav, label, c), dy in zip(navs, [0.2, 0, -0.2]):
        ms = [data.get(f"{l} / {nav}", (np.nan, 0)) for l in lands]
        ax.errorbar([m for m, _ in ms], y + dy, xerr=[s for _, s in ms], fmt="o", ms=6, color=c, label=label,
                    mec="#fcfcfb", mew=1, elinewidth=1)
    for yi, l in zip(y, lands):
        g, o = data.get(f"{l} / greedy")[0], data.get(f"{l} / oracle")[0]
        ax.plot([g, o], [yi + 0.2, yi], color=GRID, lw=3, zorder=0)
    ax.set_yticks(y, lands)
    ax.set_xlim(0, 1.02)
    pct(ax)
    ax.set_xlabel("ducklings reaching water")
    ax.legend(loc="lower right", fontsize=8)
    ax.set_title("E3. The cost of not knowing the map")
    save(fig, "e3-navigation.png")


def e6():
    rows = per_variant("e6-placement", "youngArrivalRate")
    fig, ax = plt.subplots(figsize=(5.2, 3.4))
    for strat, c in [("hotspot", C[0]), ("even", C[1]), ("random", C[2])]:
        pts = sorted((int(k.split("k=")[1]), m, se) for k, m, se, _ in rows if k.startswith(strat))
        ks, ms, ses = zip(*pts)
        ax.errorbar(ks, ms, yerr=ses, marker="o", ms=5, color=c, label=f"{strat}", elinewidth=1, mec="#fcfcfb")
        ax.annotate(strat, (ks[-1], ms[-1]), xytext=(6, 0), textcoords="offset points", va="center", color=INK, fontsize=8)
    ax.set_xticks([0, 2, 4, 8, 16])
    ax.set_xlabel("tunnels with drift fences on arterials (budget k)")
    ax.set_ylabel("ducklings reaching water")
    pct(ax, "y")
    ax.set_ylim(0, None)
    ax.legend(loc="upper left", fontsize=8)
    ax.set_title("E6. Where to put a fixed number of crossings")
    save(fig, "e6-placement.png")


def e7():
    """Per run: mean over broods of the straight-line expectation vs the simulated outcome."""
    q = db.execute("""SELECT r.id, r.variant, r.youngArrivalRate act FROM runs r WHERE experiment='e7-theory'""").fetchall()
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    seen = {}
    for r in q:
        ls = [b[0] for b in db.execute("SELECT straightLogSurv FROM broods WHERE run_id=?", (r["id"],))]
        # Each duckling arrives only if it and its mother both survive: S^2.
        pred = np.mean([math.exp(2 * x) if x is not None else 0 for x in ls])
        cls = r["variant"].split(",")[0]
        c = C[0] if cls == "residential" else C[1]
        ax.scatter(pred, r["act"], s=14, color=c, alpha=0.7, edgecolors="none",
                   label=None if cls in seen else f"{cls} streets")
        seen[cls] = 1
    ax.plot([0, 1], [0, 1], color=MUTED, lw=1, ls="--")
    ax.text(0.62, 0.55, "simulation = closed form", rotation=42, color=MUTED, fontsize=7)
    pct(ax); pct(ax, "y")
    ax.set_xlabel("closed form: mean over nests of $S_{line}^2$")
    ax.set_ylabel("simulated ducklings reaching water")
    ax.legend(fontsize=8, loc="upper left")
    ax.set_title("E7. Grids with no buildings: theory vs simulation")
    save(fig, "e7-theory.png")


def e8():
    fig, ax = plt.subplots(figsize=(5.4, 3.6))
    ext = {k: (m, se) for k, m, se, _ in per_variant("e8-species", "speciesExtinct")}
    q = {k: m for k, m, _, _ in per_variant("e8-species", "broodSuccessRate")}
    for cl, c, lab in [(0, C[0], "species nest anywhere"), (1, C[1], "each species nests in its own strip")]:
        pts = sorted((int(k.split(",")[0][2:]), *ext[k]) for k in ext if k.endswith(f"clustering={cl}"))
        ns, ms, ses = zip(*pts)
        ax.errorbar(ns, [m / n for n, m in zip(ns, ms)], yerr=[s / n for n, s in zip(ns, ses)], marker="o", ms=5,
                    color=c, label=lab, elinewidth=1, mec="#fcfcfb")
    # Binomial expectation using the unclustered success rate.
    ns = np.array([1, 2, 5, 10, 20, 50, 100])
    q0 = np.mean([q[k] for k in q if k.endswith("clustering=0")])
    ax.plot(ns, (1 - q0) ** (500 / ns), color=MUTED, ls="--", lw=1.2, label=f"binomial, $(1-q)^{{500/n}}$, q={q0:.2f}")
    ax.set_xscale("log")
    ax.set_xticks(ns, [str(n) for n in ns])
    ax.minorticks_off()
    pct(ax, "y")
    ax.set_xlabel("number of species sharing 500 mothers")
    ax.set_ylabel("species with no duckling reaching water")
    ax.legend(fontsize=7.5, loc="upper left")
    ax.set_title("E8. One season: more species, more losses")
    save(fig, "e8-species.png")


def years_matrix(exp, variant, field, years, fill=0.0):
    """Seeds x years array of `field`, with extinct years filled with `fill`."""
    runs = [r["id"] for r in db.execute("SELECT id FROM runs WHERE experiment=? AND variant=?", (exp, variant))]
    M = np.full((len(runs), years), np.nan)
    for i, rid in enumerate(runs):
        for y in db.execute(f"SELECT year, {field} v FROM years WHERE run_id=?", (rid,)):
            if y["year"] < years:
                M[i, y["year"]] = y["v"] if y["v"] is not None else np.nan
        last = np.where(~np.isnan(M[i]))[0]
        if len(last) and fill is not None:
            M[i, last[-1] + 1:] = fill
    return M


def e9():
    variants = [k for k, *_ in per_variant("e9-species-years", "mamas")]
    fig, axes = plt.subplots(1, 2, figsize=(8.6, 3.4))
    colours = {"1": C[0], "5": C[1], "20": C[2]}
    for v in variants:
        n = v.split(",")[0][2:]
        cl = v.endswith("=1")
        ls = "-" if cl else ":"
        N = years_matrix("e9-species-years", v, "nextBreeders", 30)
        axes[0].plot(np.nanmean(N, 0), color=colours[n], ls=ls, label=f"{n} species, {'clustered' if cl else 'mixed'}")
        S = years_matrix("e9-species-years", v, "speciesAlive", 30)
        axes[1].plot(np.nanmean(S, 0) / int(n), color=colours[n], ls=ls)
    axes[0].set_ylabel("breeding females")
    axes[1].set_ylabel("species still present")
    pct(axes[1], "y")
    for ax in axes:
        ax.set_xlabel("year")
    axes[0].legend(fontsize=7, loc="upper right")
    axes[0].set_title("E9. Population over 30 years")
    axes[1].set_title("Species surviving")
    fig.tight_layout()
    save(fig, "e9-species-years.png")


def e10():
    variants = [k for k, *_ in per_variant("e10-evolution", "mamas")]
    lands = list(dict.fromkeys(v.rsplit(", evolve", 1)[0] for v in variants))
    fig, axes = plt.subplots(1, 2, figsize=(8.6, 3.4))
    for land, c in zip(lands, C):
        for evolve, ls in [(False, ":"), (True, "-")]:
            v = f"{land}, evolve={'true' if evolve else 'false'}"
            N = years_matrix("e10-evolution", v, "nextBreeders", 60)
            axes[0].plot(np.nanmean(N, 0), color=c, ls=ls, label=f"{land}{' (evolving)' if evolve else ''}")
            if evolve:
                W = years_matrix("e10-evolution", v, "meanWWater", 60, fill=None)
                axes[1].plot(np.nanmean(W, 0), color=c, label=land)
    axes[0].set_ylabel("breeding females (mean of 30 seeds)")
    axes[1].set_ylabel("mean nest weight on nearness to water")
    for ax in axes:
        ax.set_xlabel("year")
    axes[0].legend(fontsize=6.5, loc="center right")
    axes[1].legend(fontsize=7, loc="upper left")
    axes[0].set_title("E10. Can nest choice evolve fast enough?")
    axes[1].set_title("The evolving preference (survivors only)")
    fig.tight_layout()
    save(fig, "e10-evolution.png")


def s1():
    rows = per_variant("s1-traffic-sensitivity", "youngArrivalRate")
    fig, ax = plt.subplots(figsize=(5.2, 3.4))
    for land, c in [("grid", C[0]), ("suburban", C[1]), ("freeway barrier", C[2])]:
        pts = sorted((float(k.rsplit("x", 1)[1]), m, se) for k, m, se, _ in rows if k.rsplit(" x", 1)[0] == land)
        xs, ms, ses = zip(*pts)
        ax.errorbar(xs, ms, yerr=ses, marker="o", ms=5, color=c, label=land, elinewidth=1, mec="#fcfcfb")
    ax.set_xscale("log")
    ax.set_xticks([0.1, 0.25, 0.5, 1, 2], ["x0.1", "x0.25", "x0.5", "x1", "x2"])
    ax.minorticks_off()
    pct(ax, "y")
    ax.set_ylim(0, 1)
    ax.set_xlabel("traffic hazard relative to default")
    ax.set_ylabel("ducklings reaching water")
    ax.legend(fontsize=8)
    ax.set_title("S1. Sensitivity to the traffic kill model")
    save(fig, "s1-traffic-sensitivity.png")


def outcome_by_distance(exp, variant, name, title):
    """Stacked histogram of nest distance to water, by brood outcome."""
    rows = db.execute("""SELECT b.dWater d, b.status s FROM broods b JOIN runs r ON r.id=b.run_id
                         WHERE r.experiment=? AND r.variant=?""", (exp, variant)).fetchall()
    cats = [("arrived", "reached water", C[0]), ("mamaKilled", "mother killed", C[1]),
            ("youngLost", "all young killed", C[4]), ("timeout", "never found water", C[6])]
    d = np.array([r["d"] for r in rows]) * 5  # metres
    s = np.array([r["s"] for r in rows])
    bins = np.arange(0, d.max() + 50, 50)
    fig, ax = plt.subplots(figsize=(5.6, 3.3))
    bottom = np.zeros(len(bins) - 1)
    for key, label, c in cats:
        h, _ = np.histogram(d[s == key], bins)
        if h.sum() == 0:
            continue
        ax.bar(bins[:-1], h, width=46, align="edge", bottom=bottom, color=c, label=label)
        bottom += h
    ax.set_xlabel("nest distance to water, straight line (m)")
    ax.set_ylabel("broods")
    ax.legend(fontsize=8)
    ax.set_title(title)
    save(fig, name)


def young_histogram():
    """How many of 8 ducklings each mother brings to water."""
    cases = [("e2-urban-form", "none", "no roads"), ("e2-urban-form", "grid, 100 m blocks", "grid, quiet streets"),
             ("e2-urban-form", "grid 100 m + arterials", "grid + arterials"),
             ("e2-urban-form", "suburban superblocks", "suburban")]
    fig, ax = plt.subplots(figsize=(6, 3.3))
    w = 0.2
    for k, ((exp, v, label), c) in enumerate(zip(cases, C)):
        a = np.array([r[0] for r in db.execute("""SELECT b.arrived FROM broods b JOIN runs r ON r.id=b.run_id
            WHERE r.experiment=? AND r.variant=?""", (exp, v))])
        h = np.bincount(a.astype(int), minlength=9) / len(a)
        ax.bar(np.arange(9) + (k - 1.5) * w, h, width=w * 0.9, color=c, label=label)
    ax.set_xticks(range(9))
    ax.set_xlabel("ducklings (of 8) a mother brings to water")
    ax.set_ylabel("share of mothers")
    pct(ax, "y")
    ax.legend(fontsize=8, loc="upper center")
    ax.set_title("Most broods arrive whole or not at all")
    save(fig, "hist-young-per-brood.png")


if __name__ == "__main__":
    print("writing figures to", OUT)
    hbars("e1-single-roads", "E1. One road between the nests and the shore", "e1-single-roads.png",
          colour_of=lambda l: C[1] if "x0.1" in l else C[0])
    hbars("e2-urban-form", "E2. Urban form", "e2-urban-form.png")
    hbars("e4-water", "E4. Where the water is, and whether it is fenced", "e4-water.png",
          colour_of=lambda l: C[1] if "fenced" in l else C[0])
    hbars("e5-mitigation", "E5. Mitigations, for a bird that cannot read the map", "e5-mitigation.png",
          colour_of=lambda l: C[0] if l.startswith("grid") else C[2])
    hbars("s2-navigator-sensitivity", "S2. Suburb: sensitivity to the navigator's free parameters",
          "s2-navigator-sensitivity.png")
    e3(); e6(); e7(); e8(); e9(); e10(); s1()
    outcome_by_distance("e2-urban-form", "grid 100 m + arterials", "hist-outcome-by-distance-grid.png",
                        "Grid + arterials: outcome by nest distance")
    outcome_by_distance("e1-single-roads", "freeway x0.1, jersey barrier", "hist-outcome-by-distance-barrier.png",
                        "Freeway with jersey barrier (x0.1 traffic): outcome by distance")
    young_histogram()
