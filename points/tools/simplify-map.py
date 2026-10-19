#!/usr/bin/env python3
"""Simplifie la carte du monde (IMG/ref/EckertIV.svg) pour l'arrière-plan animé de « Relie les points ».

Garde seulement les grandes terres (les tracés fermés de petite surface, îles et lacs, sont retirés),
simplifie leurs contours (Douglas-Peucker) et retire les pointes trop aiguës et écrit points/assets/world.json :
  { "w": largeur, "h": hauteur, "rings": [[x0, y0, x1, y1, ...], ...] }

Usage : python3 points/tools/simplify-map.py [--min-area 90] [--tolerance 2]
"""
import argparse, json, math, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'IMG/ref/EckertIV.svg'
OUT = ROOT / 'points/assets/world.json'

NUM = r'-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?'


def parse_points(attr):
    v = [float(n) for n in re.findall(NUM, attr)]
    return list(zip(v[::2], v[1::2]))


def parse_path(d):
    """Sous-tracés d'un attribut d, les courbes réduites à leurs extrémités (segments minuscules)."""
    rings, cur, x, y = [], [], 0.0, 0.0
    for cmd, args in re.findall(r'([MmZzLlHhVvCcSsQqTt])([^MmZzLlHhVvCcSsQqTt]*)', d):
        n = [float(a) for a in re.findall(NUM, args)]
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'Z':
            if cur: rings.append(cur)
            cur = []
            continue
        size = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'T': 2}[c]
        for i in range(0, len(n), size):
            a = n[i:i + size]
            if c in 'HV':
                if c == 'H': x = x + a[0] if rel else a[0]
                else: y = y + a[0] if rel else a[0]
            else:
                dx, dy = a[-2], a[-1]
                x, y = (x + dx, y + dy) if rel else (dx, dy)
            if c == 'M' and i == 0:
                if cur: rings.append(cur)
                cur = []
            cur.append((x, y))
    if cur: rings.append(cur)
    return rings


def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


def dp(pts, tol):
    """Douglas-Peucker itératif."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        L = math.hypot(x2 - x1, y2 - y1) or 1e-9
        best, idx = 0, -1
        for i in range(a + 1, b):
            x0, y0 = pts[i]
            dist = abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) / L
            if dist > best: best, idx = dist, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def simplify_ring(r, tol):
    # Coupe l'anneau au point le plus éloigné du premier pour que DP garde une forme fermée
    far = max(range(len(r)), key=lambda i: (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2)
    return dp(r[:far + 1], tol)[:-1] + dp(r[far:] + [r[0]], tol)[:-1]


def drop_spikes(r, min_angle):
    """Retire les pointes très aiguës (fjords, péninsules d'un trait) laissées par la simplification."""
    changed = True
    while changed and len(r) > 4:
        changed = False
        for i in range(len(r)):
            (ax, ay), (bx, by), (cx, cy) = r[i - 1], r[i], r[(i + 1) % len(r)]
            u, v = (ax - bx, ay - by), (cx - bx, cy - by)
            nu, nv = math.hypot(*u), math.hypot(*v)
            if nu * nv == 0 or math.degrees(math.acos(max(-1, min(1, (u[0] * v[0] + u[1] * v[1]) / (nu * nv))))) < min_angle:
                del r[i]
                changed = True
                break
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--min-area', type=float, default=90, help='surface minimale gardée (unités du viewBox²)')
    ap.add_argument('--tolerance', type=float, default=2, help='écart maximal toléré par la simplification')
    ap.add_argument('--min-angle', type=float, default=35, help='angle minimal (degrés) : les pointes plus aiguës sont retirées')
    ap.add_argument('--stats', action='store_true')
    o = ap.parse_args()

    svg = SRC.read_text()
    w, h = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups())
    rings = [parse_points(p) for p in re.findall(r'<poly(?:gon|line)[^>]* points="([^"]*)"', svg)]
    for d in re.findall(r'<path[^>]* d="([^"]*)"', svg):
        rings += parse_path(d)
    rings = [r for r in rings if len(r) >= 3]
    rings.sort(key=area, reverse=True)
    if o.stats:
        for r in rings[:40]:
            xs, ys = [p[0] for p in r], [p[1] for p in r]
            print(f'{area(r):9.1f} {len(r):6d} pts  x {min(xs):5.0f}-{max(xs):5.0f}  y {min(ys):5.0f}-{max(ys):5.0f}')
        print(len(rings), 'tracés')
        return

    kept = []
    for r in rings:
        if area(r) < o.min_area: break
        s = drop_spikes(simplify_ring(r, o.tolerance), o.min_angle)
        if len(s) >= 4:
            kept.append([round(c, 1) for p in s for c in p])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'w': w, 'h': h, 'rings': kept}, separators=(',', ':')))
    print(f'{len(kept)} terres, {sum(len(k) // 2 for k in kept)} points, {OUT.stat().st_size} octets -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
