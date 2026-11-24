#!/usr/bin/env python3
"""OG card generator, single source of truth for all social cards.

Identity: midnight-navy #0a0e17 + gold #c9a86c (the default theme's voice).
Editorial serif headline, quiet mono metadata, no gradients, no glow.
Regenerates every card in public/og/. Run from apps/site: python3 scripts/build_og_cards.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = "#0a0e17"
GOLD = "#c9a86c"
INK = "#e2e8f0"
MUTED = "#94a3b8"
HAIRLINE = "#1e293b"

SERIF = "/usr/share/fonts/TTF/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/TTF/DejaVuSans.ttf"
MONO = "/usr/share/fonts/TTF/DejaVuSansMono.ttf"

CARDS = [
    ("home", "Wyatt Au", "Systems thinker, infrastructure builder.", None),
    ("world", "World Monitor", "Live OSINT dashboards, 8 feeds, client-side analysis.", None),
    ("etf", "ETF Intelligence", "89 funds · correlation & allocation · open database.", None),
    ("ml", "ML Benchmarks", "Model performance, measured and charted client-side.", None),
    ("dossier", "Dossier", "The background file, how the work is done.", None),
    ("projects", "Projects", "Deterministic infrastructure, in production.", None),
    ("docs", "Docs", "Published standards, records, and audits.", None),
    ("guestbook", "Guestbook", "Sign the log.", None),
    ("data", "Open Data", "Keyless downloads, recomputed at every build.", None),
    ("insights", "Insights", "Original studies and first-hand event reports.", None),
    ("g1-storm", "The G1 storm, first-hand", "Captured by this site's own monitor, Kp 5.0, r = 0.79.", "EVENT REPORT · 2026-11-19"),
    ("etf-study", "Concentration study", "89 ETFs, NVDA carries the heaviest top-10 weight, 8.58%.", "DATA STUDY · 89 FUNDS"),
]


def render(slug, headline, summary, slugline):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    x = 96
    top = 120

    # gold hairline + slugline (mono, metadata role)
    d.rectangle([x, top, x + 150, top + 3], fill=GOLD)
    tag = slugline or "WYATTAU.COM"
    d.text((x, top + 28), tag, font=ImageFont.truetype(MONO, 22), fill=GOLD)

    # serif headline, wrap at ~26 chars
    f_head = ImageFont.truetype(SERIF, 72)
    words, lines, cur = headline.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if d.textlength(trial, font=f_head) > W - 2 * x:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    lines.append(cur)
    y = top + 96
    for line in lines[:3]:
        d.text((x, y), line, font=f_head, fill=INK)
        y += 86

    # summary
    if summary:
        f_sum = ImageFont.truetype(SANS, 27)
        words, cur = summary.split(), ""
        for w in words:
            trial = (cur + " " + w).strip()
            if d.textlength(trial, font=f_sum) > W - 2 * x - 120:
                d.text((x, y + 24), cur, font=f_sum, fill=MUTED)
                y += 40
                cur = w
            else:
                cur = trial
        d.text((x, y + 24), cur, font=f_sum, fill=MUTED)

    # footer: hairline + url
    d.rectangle([x, H - 96, W - x, H - 95], fill=HAIRLINE)
    d.text((x, H - 74), "wyattau.com", font=ImageFont.truetype(MONO, 24), fill=GOLD)

    out = f"public/og/{slug}.png"
    img.save(out, optimize=True)
    return os.path.getsize(out) // 1024


for slug, head, summ, tag in CARDS:
    kb = render(slug, head, summ, tag)
    print(f"{slug}: {kb} KB")
