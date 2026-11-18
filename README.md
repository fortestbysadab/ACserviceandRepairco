# Sheetal — AC Service & Repair

A world-class AC service &amp; repair category page — a fresh take on the Urban Company
**AC Service & Repair** listing, rebuilt as a new brand called **Sheetal**.

Live page: `index.html` (repo root) — **one self-contained file**. All nine photographs are
inlined as base64 WebP, every icon is an inline SVG, and no fonts or scripts are fetched from
the network. It renders identically offline, on Vercel, on Render, or from a USB stick.

---

## Deploy

### Vercel (recommended — zero config)
1. **vercel.com → Add New → Project → Import** `fortestbysadab/ACserviceandRepairco`.
2. Framework preset: **Other**. Build command: **empty**. Output directory: **`.`** (repo root).
3. **Deploy.** `vercel.json` already handles clean URLs, security headers and asset caching.

Or from the CLI:
```bash
npm i -g vercel
vercel --prod          # inside the repo, accept the defaults
```

### Render (static site)
1. **dashboard.render.com → New + → Static Site** → connect the same repo.
2. Build command: *(leave blank)* · Publish directory: `.`
3. **Create Static Site.**

Or use the blueprint: **New + → Blueprint** and pick the repo — `render.yaml` is detected
automatically and configures headers/redirects for you.

Both platforms serve `index.html` from the root, so no build step and no environment
variables are required.

---

## What's on the page

| Section | Notes |
|---|---|
| Top strip + sticky header | City switcher (Delhi NCR default, 7 cities), cart badge, blur-on-scroll |
| Hero | 4.79 rating proof, live availability card, floating trust cards |
| Category rail | Sticky filter chips (All / Cleaning / Repair / Installation / Plans / Parts) + live search |
| 19 service cards | Foam-jet (1/2/3 ACs), power-jet, window AC, anti-rust, repair visit, gas refill, gas top-up, water leak, PCB, noise, compressor, install / uninstall / reinstall, wall stand, copper pipe |
| Offer banner | `CHILL20` — 20% off, capped ₹500, copy-to-clipboard |
| Care plans | Three-tier dark premium section (1 AC / 2 ACs / 2 years) |
| Why Sheetal | Team photo, verified-pro positioning, four USPs |
| How it works | Three steps |
| Transparent price list | Four accordion groups, 26 real line items |
| Reviews | 4.79 summary, rating distribution, six snap-scrolling review cards |
| FAQ | Eight accordion questions |
| Cities + footer | 12 city tags, app badges, payment marks |

### Working functionality
- Add to cart from any card or plan, quantity steppers, remove
- Auto-applies **CHILL20** once the cart crosses ₹1,000 (cap ₹500); **FIRST100** also works
- Live bill — item total, pre-existing savings, discount, 18% GST, payable — drives the drawer,
  the mobile bar and the checkout modal
- Checkout: date chips + 2-hour time slots + name/mobile/address validation → booking-ID receipt
- Tab filter + search, including the empty state
- Reveal-on-scroll, hover states, toasts, `Esc` to close, visible focus rings, `prefers-reduced-motion` support

---

## Repo layout

```
index.html      ← built, self-contained page (this is what gets deployed)
assets/         ← the 9 source photographs (AI-generated, watermark-free)
src/part1.html  ← head, design-system CSS, icon sprite, header, hero, rail
src/part2.html  ← all content sections + footer
src/part3.html  ← cart drawer, booking modal, toast, all JavaScript
src/more.css    ← section-level CSS, merged into the head at build time
build.py        ← concatenates the sources, merges CSS, inlines images
vercel.json     ← Vercel config (headers, redirects, clean URLs)
render.yaml     ← Render Blueprint (static site)
```

### Editing
Edit anything in `src/`, then rebuild:

```bash
pip install pillow
python3 build.py     # rewrites index.html
```

Re-skin the whole site by changing `--brand`, `--brand-2`, `--ink` and `--bg` in the `:root`
block of `src/part1.html`. Copy and prices live in `src/part2.html`; cart, coupon and
checkout logic live at the bottom of `src/part3.html`.

---

> Sheetal is a fictional brand built as a design demonstration. Service names and price points
> intentionally mirror the real Urban Company Delhi NCR catalogue for realism. Not affiliated
> with Urban Company.
