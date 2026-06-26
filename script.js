/* ═══════════════════════════════════════════════════════════
   APEX REAL ESTATE PHOTOGRAPHY — JAVASCRIPT
   Interactions: Nav, Slideshow, Filter, Scroll Reveal, Lightbox
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── NAV: SCROLL STATE ──────────────────────────────────── */
const nav = document.getElementById('main-nav');

function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ─── NAV: MOBILE HAMBURGER ──────────────────────────────── */
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('nav-mobile-menu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

/* ─── HERO SLIDESHOW ─────────────────────────────────────── */
const slides = document.querySelectorAll('.hero-slide');
let currentSlide = 0;

if (slides.length > 1) {
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 6500);
}

/* ─── PORTFOLIO FILTER ───────────────────────────────────── */
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    portfolioItems.forEach(item => {
      const show = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('hidden', !show);
    });
  });
});

/* ─── SCROLL REVEAL ──────────────────────────────────────── */
const revealTargets = document.querySelectorAll(
  '.trust-pillar, .service-card, .process-step, .testimonial-card, .addon-item, .about-content, .about-image-wrap, .section-header, .portfolio-cta-wrap, .process-cta, .trust-agencies'
);

revealTargets.forEach((el) => {
  el.classList.add('reveal');
  const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
  const idx = siblings.indexOf(el);
  if (idx === 1) el.classList.add('reveal-delay-1');
  else if (idx === 2) el.classList.add('reveal-delay-2');
  else if (idx === 3) el.classList.add('reveal-delay-3');
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.10, rootMargin: '0px 0px -32px 0px' }
);

revealTargets.forEach(el => revealObserver.observe(el));

/* ─── PORTFOLIO ITEM STAGGERED ENTRANCE ──────────────────── */
portfolioItems.forEach((item, i) => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(18px)';
  item.style.transition = `opacity 0.55s ease ${i * 0.07}s, transform 0.55s ease ${i * 0.07}s`;
});

const portfolioObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        portfolioObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);

portfolioItems.forEach(item => portfolioObserver.observe(item));

/* ─── SMOOTH ANCHOR SCROLL ───────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - nav.offsetHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ─── WHATSAPP FLOAT: FADE IN AFTER SCROLL ───────────────── */
const waFloat = document.getElementById('whatsapp-float');

Object.assign(waFloat.style, {
  opacity: '0',
  transform: 'scale(0.85) translateY(6px)',
  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
});

function updateFloat() {
  const show = window.scrollY > 280;
  waFloat.style.opacity = show ? '1' : '0';
  waFloat.style.transform = show ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(6px)';
}
window.addEventListener('scroll', updateFloat, { passive: true });

/* ─── COUNTER ANIMATION (About stats) ───────────────────── */
function animateCounter(el) {
  const raw = el.textContent.trim();
  const num = parseInt(raw.replace(/\D/g, ''), 10);
  const suffix = raw.replace(/[0-9]/g, '');
  if (!num || isNaN(num)) return;

  const duration = 1600;
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * num) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statEls = document.querySelectorAll('.stat-number');
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
statEls.forEach(el => statObserver.observe(el));

/* ─── PORTFOLIO MULTI-IMAGE LIGHTBOX ─────────────────────── */
const lightbox = (() => {
  let images = [];
  let currentIndex = 0;
  let titleText = '';
  let locationText = '';

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(15,15,14,0.96)',
    zIndex: '9999',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    cursor: 'default',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    userSelect: 'none'
  });

  const contentWrap = document.createElement('div');
  Object.assign(contentWrap.style, {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const img = document.createElement('img');
  Object.assign(img.style, {
    maxWidth: '100%', maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '6px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
    transition: 'opacity 0.25s ease'
  });

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&#8592;';
  prevBtn.setAttribute('aria-label', 'Previous image');
  Object.assign(prevBtn.style, {
    position: 'absolute', left: '-60px',
    background: 'none', border: 'none', color: '#E0E0E0',
    fontSize: '2.5rem', cursor: 'pointer', opacity: '0.6',
    transition: 'opacity 0.2s, transform 0.2s', padding: '10px'
  });

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&#8594;';
  nextBtn.setAttribute('aria-label', 'Next image');
  Object.assign(nextBtn.style, {
    position: 'absolute', right: '-60px',
    background: 'none', border: 'none', color: '#E0E0E0',
    fontSize: '2.5rem', cursor: 'pointer', opacity: '0.6',
    transition: 'opacity 0.2s, transform 0.2s', padding: '10px'
  });

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');
  Object.assign(closeBtn.style, {
    position: 'fixed', top: '24px', right: '28px',
    background: 'none', border: 'none',
    color: '#E0E0E0', fontSize: '2.5rem',
    cursor: 'pointer', lineHeight: '1', zIndex: '10000',
    opacity: '0.7', transition: 'opacity 0.2s'
  });

  const infoPanel = document.createElement('div');
  Object.assign(infoPanel.style, {
    marginTop: '20px',
    textAlign: 'center',
    color: '#E0E0E0',
    fontFamily: 'sans-serif'
  });

  const titleEl = document.createElement('h4');
  Object.assign(titleEl.style, {
    margin: '0 0 4px 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    letterSpacing: '0.03em',
    color: '#FFFSE6'
  });

  const locEl = document.createElement('p');
  Object.assign(locEl.style, {
    margin: '0 0 10px 0',
    fontSize: '0.82rem',
    color: '#778899'
  });

  const dotsWrap = document.createElement('div');
  Object.assign(dotsWrap.style, {
    display: 'flex', gap: '8px', justifyContent: 'center'
  });

  // Hover states
  [prevBtn, nextBtn, closeBtn].forEach(b => {
    b.onmouseenter = () => b.style.opacity = '1';
    b.onmouseleave = () => b.style.opacity = '0.6';
  });

  contentWrap.appendChild(prevBtn);
  contentWrap.appendChild(img);
  contentWrap.appendChild(nextBtn);
  overlay.appendChild(closeBtn);
  infoPanel.appendChild(titleEl);
  infoPanel.appendChild(locEl);
  infoPanel.appendChild(dotsWrap);
  overlay.appendChild(contentWrap);
  overlay.appendChild(infoPanel);
  document.body.appendChild(overlay);

  const showImage = (index) => {
    currentIndex = (index + images.length) % images.length;
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = images[currentIndex];
      img.alt = `${titleText} - View ${currentIndex + 1}`;
      img.style.opacity = '1';
    }, 150);

    // Update dots
    dotsWrap.innerHTML = '';
    images.forEach((_, i) => {
      const dot = document.createElement('span');
      Object.assign(dot.style, {
        width: '6px', height: '6px', borderRadius: '50%',
        background: i === currentIndex ? '#D4AF37' : 'rgba(255,255,255,0.2)',
        cursor: 'pointer', transition: 'background 0.2s'
      });
      dot.onclick = () => showImage(i);
      dotsWrap.appendChild(dot);
    });

    // Hide navigation arrows if only 1 image exists
    prevBtn.style.display = images.length > 1 ? 'block' : 'none';
    nextBtn.style.display = images.length > 1 ? 'block' : 'none';
  };

  const open = (imgList, title, loc) => {
    images = imgList;
    titleText = title;
    locationText = loc;
    titleEl.textContent = title;
    locEl.textContent = loc;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showImage(0);

    // Responsive arrows adjustment
    if (window.innerWidth < 768) {
      prevBtn.style.left = '10px';
      nextBtn.style.right = '10px';
      prevBtn.style.fontSize = '2rem';
      nextBtn.style.fontSize = '2rem';
    } else {
      prevBtn.style.left = '-60px';
      nextBtn.style.right = '-60px';
    }
  };

  const close = () => {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  };

  overlay.addEventListener('click', e => { if (e.target === overlay || e.target === contentWrap) close(); });
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
  nextBtn.addEventListener('click', () => showImage(currentIndex + 1));
  document.addEventListener('keydown', e => {
    if (overlay.style.display === 'flex') {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
      if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    }
  });

  return { open };
})();

portfolioItems.forEach(item => {
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');

  const activate = () => {
    const rawList = item.dataset.images;
    if (rawList) {
      const imgList = rawList.split(',').map(s => s.trim());
      const title = item.dataset.title || '';
      const loc = item.dataset.location || '';
      lightbox.open(imgList, title, loc);
    }
  };

  item.addEventListener('click', activate);
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });
});
