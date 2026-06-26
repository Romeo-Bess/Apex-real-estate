# APEX Real Estate Photography

**South Africa's most trusted real estate photography studio.**  
Professional property photography with 24-hour turnaround. Serving Cape Town & Johannesburg.

🌐 **Live site:** [apexphotography.co.za](https://apex-real-estate.vercel.app)

---

## Brand

| Token | Value |
|---|---|
| Primary Dark | Midnight Graphite `#1A1A1A` |
| Primary Light | Warm Cream `#FFF5E6` |
| Accent | Antique Bronze `#D4AF37` |
| Display Font | Bodoni Moda (Google Fonts) |
| UI Font | DM Sans (Google Fonts) |

---

## Project Structure

```
/
├── index.html          # Single-page site
├── styles.css          # All styling (design tokens + components)
├── script.js           # Interactions (nav, slideshow, filter, lightbox)
├── images/             # AI-generated property photography
├── vercel.json         # Vercel deployment config
├── mobile-test.js      # Puppeteer mobile test suite
└── package.json
```

## Running Locally

```bash
# Serve the site
python -m http.server 8765
# → open http://localhost:8765

# Run mobile tests (requires site running on :8765)
npm run test:mobile
```

## Deployment

**Vercel (primary):** Connect this repo in Vercel — it auto-detects static HTML.  
**GitHub Pages:** Enable in repo Settings → Pages → Deploy from branch `main` / root.

---

## Mobile Testing

Puppeteer tests cover 8 device profiles:
- iPhone SE / 14 Pro / 14 Pro Max
- Samsung Galaxy S21 / A54
- iPad Mini / iPad Pro 11"
- Desktop 1920×1080

Checks: overflow, touch targets (≥44px), image loading, font readability, JS errors.

---

*Luxury · Trust · Sophistication*
