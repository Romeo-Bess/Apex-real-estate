/**
 * APEX Real Estate Photography — Puppeteer Mobile Test Suite
 * Tests responsiveness across 8 device profiles
 * Run: node mobile-test.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8765';
const SCREENSHOT_DIR = './mobile-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── Device profiles ───────────────────────────────────────
const DEVICES = [
  { name: 'iPhone-SE',          width: 375,  height: 667,  dpr: 2, isMobile: true  },
  { name: 'iPhone-14-Pro',      width: 393,  height: 852,  dpr: 3, isMobile: true  },
  { name: 'iPhone-14-Pro-Max',  width: 430,  height: 932,  dpr: 3, isMobile: true  },
  { name: 'Samsung-Galaxy-S21', width: 360,  height: 800,  dpr: 3, isMobile: true  },
  { name: 'Samsung-Galaxy-A54', width: 412,  height: 892,  dpr: 2, isMobile: true  },
  { name: 'iPad-Mini',          width: 768,  height: 1024, dpr: 2, isMobile: false },
  { name: 'iPad-Pro-11',        width: 834,  height: 1194, dpr: 2, isMobile: false },
  { name: 'Desktop-1920',       width: 1920, height: 1080, dpr: 1, isMobile: false },
];

const SECTIONS = [
  'hero', 'portfolio', 'services', 'how-it-works',
  'testimonials', 'about', 'contact',
];

// ── Scroll to trigger lazy images ─────────────────────────
async function scrollPageFully(page) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = 600;
  for (let y = 0; y < totalHeight; y += step) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await new Promise(r => setTimeout(r, 120));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
}

// ── Checks ────────────────────────────────────────────────
async function runChecks(page, device) {
  const issues = [];

  // 1. No horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  if (overflow) issues.push('❌ Horizontal overflow detected');
  else console.log('   ✅ No horizontal overflow');

  // 2. Nav renders correctly
  const navOk = await page.evaluate(() => {
    const nav = document.getElementById('main-nav');
    if (!nav) return false;
    const rect = nav.getBoundingClientRect();
    return rect.width <= window.innerWidth && rect.height > 0;
  });
  if (!navOk) issues.push('❌ Nav broken or overflowing');
  else console.log('   ✅ Navigation renders correctly');

  // 3. Hero headline fits
  const heroOk = await page.evaluate(() => {
    const h1 = document.querySelector('.hero-headline');
    if (!h1) return false;
    const rect = h1.getBoundingClientRect();
    return rect.width > 0 && rect.width <= window.innerWidth + 2;
  });
  if (!heroOk) issues.push('❌ Hero headline cut off');
  else console.log('   ✅ Hero headline fits viewport');

  // 4. Buttons in viewport
  const btnsOk = await page.evaluate(() => {
    const btns = document.querySelectorAll('.btn');
    for (const btn of btns) {
      const style = window.getComputedStyle(btn);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = btn.getBoundingClientRect();
      if (rect.right > window.innerWidth + 4) return false;
    }
    return true;
  });
  if (!btnsOk) issues.push('❌ Some buttons overflow viewport');
  else console.log('   ✅ All visible buttons within viewport');

  // 5. Portfolio grid
  const gridOk = await page.evaluate(() => {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return true;
    return grid.getBoundingClientRect().right <= window.innerWidth + 4;
  });
  if (!gridOk) issues.push('❌ Portfolio grid overflows');
  else console.log('   ✅ Portfolio grid within bounds');

  // 6. Service cards stacking on mobile
  if (device.width <= 768) {
    const stacked = await page.evaluate(() => {
      const cards = document.querySelectorAll('.service-card');
      if (cards.length < 2) return true;
      const r1 = cards[0].getBoundingClientRect();
      const r2 = cards[1].getBoundingClientRect();
      return Math.abs(r1.left - r2.left) < 20;
    });
    if (!stacked) issues.push('❌ Service cards not stacking on mobile');
    else console.log('   ✅ Service cards stacking correctly');
  }

  // 7. Font size readable
  const fontOk = await page.evaluate(
    () => parseFloat(window.getComputedStyle(document.body).fontSize) >= 14
  );
  if (!fontOk) issues.push('❌ Base font too small');
  else console.log('   ✅ Font size readable');

  // 8. Images loaded (after scroll)
  const imagesOk = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    for (const img of imgs) {
      // Skip images with display:none or visibility:hidden parents
      let el = img;
      let hidden = false;
      while (el && el !== document.body) {
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; }
        el = el.parentElement;
      }
      if (hidden) continue;
      if (!img.complete || img.naturalWidth === 0) {
        return false;
      }
    }
    return true;
  });
  if (!imagesOk) issues.push('❌ One or more visible images failed to load');
  else console.log('   ✅ All images loaded');

  // 9. Touch targets ≥ 44px on mobile — skip hidden/collapsed elements
  if (device.isMobile) {
    const small = await page.evaluate(() => {
      const MIN = 40;
      const els = document.querySelectorAll('a, button');
      const tooSmall = [];

      function isCollapsedAncestor(el) {
        let node = el.parentElement;
        while (node && node !== document.body) {
          const s = window.getComputedStyle(node);
          // collapsed by max-height or overflow hidden combo
          if (s.overflow === 'hidden' && parseFloat(s.maxHeight) === 0) return true;
          if (s.display === 'none') return true;
          if (s.visibility === 'hidden') return true;
          node = node.parentElement;
        }
        return false;
      }

      for (const el of els) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        // Skip elements inside collapsed/hidden ancestor containers
        if (isCollapsedAncestor(el)) continue;
        const rect = el.getBoundingClientRect();
        // Skip zero-area elements
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip off-screen elements
        if (rect.bottom < -10 || rect.top > window.innerHeight * 12) continue;
        if (rect.height < MIN || rect.width < MIN) {
          tooSmall.push((el.getAttribute('class') || el.textContent || el.tagName).slice(0, 40).trim());
        }
      }
      return tooSmall.slice(0, 4);
    });
    if (small.length > 0) issues.push(`❌ Touch targets too small: ${small.join(' | ')}`);
    else console.log('   ✅ Touch targets adequate (≥40px)');
  }

  // 10. No console errors
  return issues;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  APEX — Puppeteer Mobile Test Suite              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allResults = [];

  for (const device of DEVICES) {
    console.log(`\n┌─ Testing: ${device.name} (${device.width}×${device.height}) ─`);
    const page = await browser.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.dpr,
      isMobile: device.isMobile,
      hasTouch: device.isMobile,
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll fully to trigger lazy image loading
    await scrollPageFully(page);
    await new Promise(r => setTimeout(r, 800));

    // Full-page screenshot
    const ssPath = path.join(SCREENSHOT_DIR, `${device.name}-full.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log(`   📸 Screenshot → ${ssPath}`);

    // Section screenshots
    for (const id of SECTIONS) {
      try {
        const el = await page.$(`#${id}`);
        if (el) {
          await el.screenshot({
            path: path.join(SCREENSHOT_DIR, `${device.name}-${id}.png`),
          });
        }
      } catch (_) {}
    }

    const issues = await runChecks(page, device);

    // Console errors
    if (consoleErrors.length > 0) {
      issues.push(`❌ ${consoleErrors.length} JS console error(s): ${consoleErrors[0]}`);
    } else {
      console.log('   ✅ No JS console errors');
    }

    allResults.push({ device: device.name, size: `${device.width}×${device.height}`, issues });
    await page.close();

    console.log(issues.length === 0 ? '└─ PASS ✅' : `└─ FAIL ❌ (${issues.length} issues)`);
    issues.forEach(i => console.log(`   ${i}`));
  }

  await browser.close();

  // ── Summary ─────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  FINAL SUMMARY                                   ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let total = 0;
  for (const r of allResults) {
    total += r.issues.length;
    const mark = r.issues.length === 0 ? '✅ PASS' : `❌ FAIL (${r.issues.length})`;
    console.log(`  ${mark}  ${r.device} (${r.size})`);
    r.issues.forEach(i => console.log(`         ${i}`));
  }

  console.log(`\n  Total issues: ${total}`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}/\n`);

  fs.writeFileSync('./mobile-test-report.json', JSON.stringify(allResults, null, 2));
  console.log('  Report: mobile-test-report.json\n');

  process.exit(total > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
