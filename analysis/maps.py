"""Map figures from results/snapshots/*.json (written by src/experiment/snapshot.js).

    python3 analysis/maps.py                 # every snapshot -> results/figures/maps/
    python3 analysis/maps.py a.json b.json   # just these

Each map shows the landscape, every nest coloured by its brood's outcome, and the
paths of a sample of broods.
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "results" / "figures" / "maps"

# Cell colours: open, green, road (by class below), wall, water, crossing.
OPEN, GREEN, ROAD, WALL, WATER, CROSSING = range(6)
CELL = {
    "open": "#f3f1ea", "green": "#d4e6c8", "wall": "#4a4540", "water": "#a9cdf0", "crossing": "#eda100",
    "residential": "#c9c6bd", "collector": "#a8a59c", "arterial": "#827f77", "freeway": "#55524c",
}
OUTCOME = {  # categorical slots from the reference palette, in fixed order
    "arrived": ("#2a78d6", "reached water"),
    "mamaKilled": ("#eb6834", "mother killed"),
    "youngLost": ("#e87ba4", "all young killed"),
    "timeout": ("#6250d6", "never found water"),
}


def landscape(snap):
    w, h = snap["width"], snap["height"]
    t = np.array(snap["type"]).reshape(h, w)
    rc = np.array(snap["roadClass"]).reshape(h, w)
    # Codes: 0 open,1 green,2 wall,3 water,4 crossing,5-8 road classes
    code = np.select([t == OPEN, t == GREEN, t == WALL, t == WATER, t == CROSSING, t == ROAD],
                     [0, 1, 2, 3, 4, 4 + rc])
    cmap = ListedColormap([CELL[k] for k in
                           ["open", "green", "wall", "water", "crossing", "residential", "collector", "arterial", "freeway"]])
    return code, cmap


def draw(snap, ax, paths=60, title=None):
    code, cmap = landscape(snap)
    ax.imshow(code, cmap=cmap, vmin=0, vmax=8, interpolation="nearest")
    w = snap["width"]
    broods = snap["broods"]
    step = max(1, len(broods) // paths)
    for b in broods[::step]:
        if len(b["path"]) < 2:
            continue
        p = np.array(b["path"])
        colour = OUTCOME.get(b["status"], ("#888", ""))[0]
        ax.plot(p % w, p // w, color=colour, lw=0.6, alpha=0.55)
    for status, (colour, _) in OUTCOME.items():
        pts = [(b["x"], b["y"]) for b in broods if b["status"] == status]
        if pts:
            xs, ys = zip(*pts)
            ax.scatter(xs, ys, s=7, color=colour, edgecolors="white", linewidths=0.4, zorder=3)
    ax.set_xticks([]); ax.set_yticks([])
    s = snap["summary"]
    ax.set_title(title or snap["variant"], fontsize=9, loc="left")
    ax.text(0.01, -0.02, f"{100 * s['youngArrivalRate']:.0f}% of young reach water",
            transform=ax.transAxes, va="top", fontsize=8, color="#52514e")


def legend_handles():
    h = [Line2D([], [], marker="o", ls="", color=c, label=l) for c, l in OUTCOME.values()]
    h += [Line2D([], [], marker="s", ls="", color=CELL[k], markersize=8, label=l) for k, l in
          [("water", "water"), ("green", "park / green"), ("residential", "quiet street"), ("arterial", "arterial"),
           ("freeway", "freeway"), ("wall", "wall / fence / building"), ("crossing", "safe crossing")]]
    return h


def main(paths):
    OUT.mkdir(parents=True, exist_ok=True)
    snaps = [json.loads(Path(p).read_text()) for p in paths]
    for p, snap in zip(paths, snaps):
        fig, ax = plt.subplots(figsize=(5.2, 5.6))
        draw(snap, ax)
        fig.legend(handles=legend_handles(), loc="lower center", ncol=4, fontsize=6.5, frameon=False)
        fig.subplots_adjust(bottom=0.16, top=0.94, left=0.03, right=0.97)
        fig.savefig(OUT / (Path(p).stem + ".png"), dpi=160)
        plt.close(fig)
    # One gallery sheet.
    n = len(snaps)
    cols = 4
    rows = (n + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(3.2 * cols, 3.5 * rows + 0.6))
    for ax in np.ravel(axes)[n:]:
        ax.axis("off")
    for ax, snap in zip(np.ravel(axes), snaps):
        draw(snap, ax, paths=40, title=f"{snap['variant']}")
    fig.legend(handles=legend_handles(), loc="lower center", ncol=6, fontsize=8, frameon=False)
    fig.subplots_adjust(bottom=0.08, top=0.97, hspace=0.25, wspace=0.05, left=0.01, right=0.99)
    fig.savefig(OUT / "gallery.png", dpi=130)
    plt.close(fig)
    print(f"wrote {n} maps and gallery.png to {OUT}")


if __name__ == "__main__":
    args = sys.argv[1:] or sorted(str(p) for p in (ROOT / "results" / "snapshots").glob("*.json"))
    main(args)
