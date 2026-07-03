/* ═══════════════════════════════════════════════════════════
   PROPERTY CATALOGUE — COMPONENTS
   PropertyCard → grid card rendered from window.PROPERTIES
   ProjectView  → full-screen "editing cockpit": frame gallery,
                  HUD counter, sandboxed video walkthrough

   Loaded BEFORE script.js so the existing filter / reveal /
   stagger logic binds to the rendered cards untouched. Cards
   deliberately omit data-images, so the legacy lightbox in
   script.js stays dormant without being removed.

   Security: all DOM is built with createElement/textContent
   (no innerHTML from data). Photo paths must match the local
   images/ allowlist; video URLs are validated and rewritten
   to privacy-enhanced YouTube/Vimeo embeds or dropped.
   ═══════════════════════════════════════════════════════════ */

'use strict';

(() => {

  const REGION_LABELS = { cpt: 'Cape Town', jhb: 'Johannesburg', winelands: 'Winelands' };
  const WA_NUMBER = '27821234567';

  /* ─── SANITIZERS ─────────────────────────────────────────── */
  const SAFE_PHOTO = /^images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|avif)$/i;
  const safePhotos = list =>
    Array.isArray(list) ? list.filter(src => typeof src === 'string' && SAFE_PHOTO.test(src)) : [];

  const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

  function sanitizeVideoUrl(raw) {
    if (typeof raw !== 'string' || raw === '') return null;
    let url;
    try { url = new URL(raw); } catch { return null; }
    if (url.protocol !== 'https:') return null;

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const ytEmbed = id => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const embed = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)$/);
      if (embed && YT_ID.test(embed[1])) return ytEmbed(embed[1]);
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        if (id && YT_ID.test(id)) return ytEmbed(id);
      }
      return null;
    }
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1);
      return YT_ID.test(id) ? ytEmbed(id) : null;
    }
    if (host === 'vimeo.com') {
      const m = url.pathname.match(/^\/(\d{6,12})$/);
      return m ? `https://player.vimeo.com/video/${m[1]}?dnt=1` : null;
    }
    if (host === 'player.vimeo.com') {
      const m = url.pathname.match(/^\/video\/(\d{6,12})$/);
      return m ? `https://player.vimeo.com/video/${m[1]}?dnt=1` : null;
    }
    return null;
  }

  /* ─── DOM HELPERS ────────────────────────────────────────── */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const pad = n => String(n).padStart(2, '0');

  function blurUp(img) {
    img.classList.add('lazy-blur');
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  }

  /* ─── PropertyCard ───────────────────────────────────────── */
  function PropertyCard(property, index) {
    const photos = safePhotos(property.photos);
    if (!photos.length) return null;

    const card = el('div', 'portfolio-item' + (property.featured ? ' featured' : ''));
    card.id = `prop-${property.id}`;
    card.dataset.category = property.region;
    card.setAttribute('aria-label', `Open project: ${property.title}, ${property.location}`);

    const img = el('img');
    img.src = photos[0];
    img.alt = `${property.title} — ${property.location}`;
    img.loading = property.featured ? 'eager' : 'lazy';
    if (property.featured) img.setAttribute('fetchpriority', 'high');
    img.decoding = 'async';
    blurUp(img);

    const overlay = el('div', 'portfolio-overlay');
    const meta = el('div', 'portfolio-meta');
    meta.appendChild(el('span', 'portfolio-tag', REGION_LABELS[property.region] || 'South Africa'));
    meta.appendChild(el('span', 'portfolio-count', `${photos.length} Frames`));
    if (sanitizeVideoUrl(property.video)) {
      meta.appendChild(el('span', 'portfolio-film-badge', '▸ Film'));
    }
    overlay.appendChild(meta);
    overlay.appendChild(el('h3', null, property.title));
    overlay.appendChild(el('p', 'portfolio-location', property.location));

    card.appendChild(img);
    card.appendChild(overlay);

    const openView = () => ProjectView.open(property, index, card);
    card.addEventListener('click', openView);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openView(); }
    });

    return card;
  }

  /* ─── ProjectView (singleton, built on first open) ───────── */
  const ProjectView = (() => {
    let root, shell, closeBtn, fileEl, titleEl, locEl, briefEl, chipsWrap,
        thumbsWrap, stagePhoto, stageVideo, stageImg, counterEl, ticksWrap,
        prevBtn, nextBtn, stillsBtn, filmBtn, ctaLink;

    let photos = [], frame = 0, videoUrl = null, current = null;
    let lastFocus = null, isOpen = false, hideTimer = null;

    function build() {
      root = el('div', 'pv-root');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Project view');

      const backdrop = el('div', 'pv-backdrop');
      backdrop.addEventListener('click', close);

      shell = el('div', 'pv-shell');

      /* Top bar */
      const topbar = el('header', 'pv-topbar');
      const idBlock = el('div', 'pv-topbar-id');
      fileEl = el('span', 'pv-file');
      idBlock.appendChild(fileEl);
      const titleBlock = el('div', 'pv-topbar-title');
      titleEl = el('h2', 'pv-title');
      locEl = el('p', 'pv-location');
      titleBlock.appendChild(titleEl);
      titleBlock.appendChild(locEl);

      const modeWrap = el('div', 'pv-mode');
      modeWrap.setAttribute('role', 'tablist');
      modeWrap.setAttribute('aria-label', 'Media type');
      stillsBtn = el('button', 'pv-mode-btn active', 'Stills');
      filmBtn = el('button', 'pv-mode-btn', 'Walkthrough');
      [stillsBtn, filmBtn].forEach(b => { b.type = 'button'; b.setAttribute('role', 'tab'); });
      stillsBtn.addEventListener('click', () => setMode('stills'));
      filmBtn.addEventListener('click', () => setMode('film'));
      modeWrap.appendChild(stillsBtn);
      modeWrap.appendChild(filmBtn);

      closeBtn = el('button', 'pv-close', '✕');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close project view');
      closeBtn.addEventListener('click', close);

      topbar.appendChild(idBlock);
      topbar.appendChild(titleBlock);
      topbar.appendChild(modeWrap);
      topbar.appendChild(closeBtn);

      /* Stage — photo deck */
      stagePhoto = el('div', 'pv-stage-photo');
      const frameWrap = el('figure', 'pv-frame');
      stageImg = el('img', 'pv-img');
      stageImg.alt = '';
      stageImg.decoding = 'async';
      frameWrap.appendChild(stageImg);

      prevBtn = el('button', 'pv-nav pv-prev', '←');
      nextBtn = el('button', 'pv-nav pv-next', '→');
      prevBtn.type = nextBtn.type = 'button';
      prevBtn.setAttribute('aria-label', 'Previous frame');
      nextBtn.setAttribute('aria-label', 'Next frame');
      prevBtn.addEventListener('click', () => showFrame(frame - 1));
      nextBtn.addEventListener('click', () => showFrame(frame + 1));

      const hud = el('div', 'pv-hud');
      counterEl = el('span', 'pv-counter');
      ticksWrap = el('div', 'pv-ticks');
      hud.appendChild(counterEl);
      hud.appendChild(ticksWrap);

      stagePhoto.appendChild(frameWrap);
      stagePhoto.appendChild(prevBtn);
      stagePhoto.appendChild(nextBtn);
      stagePhoto.appendChild(hud);

      /* Stage — video deck (iframe injected on demand) */
      stageVideo = el('div', 'pv-stage-video hidden');

      const stage = el('div', 'pv-stage');
      stage.appendChild(stagePhoto);
      stage.appendChild(stageVideo);

      /* Side panel */
      const side = el('aside', 'pv-side');

      const briefBlock = el('div', 'pv-side-block');
      briefBlock.appendChild(el('span', 'pv-side-label', 'Brief'));
      briefEl = el('p', 'pv-brief');
      briefBlock.appendChild(briefEl);

      const coverageBlock = el('div', 'pv-side-block');
      coverageBlock.appendChild(el('span', 'pv-side-label', 'Coverage'));
      chipsWrap = el('div', 'pv-chips');
      coverageBlock.appendChild(chipsWrap);

      const framesBlock = el('div', 'pv-side-block pv-side-frames');
      framesBlock.appendChild(el('span', 'pv-side-label', 'Frames'));
      thumbsWrap = el('div', 'pv-thumbs');
      framesBlock.appendChild(thumbsWrap);

      ctaLink = el('a', 'btn btn-primary pv-cta', 'Book a shoot like this');
      ctaLink.target = '_blank';
      ctaLink.rel = 'noopener noreferrer';

      side.appendChild(briefBlock);
      side.appendChild(coverageBlock);
      side.appendChild(framesBlock);
      side.appendChild(ctaLink);

      const body = el('div', 'pv-body');
      body.appendChild(stage);
      body.appendChild(side);

      shell.appendChild(topbar);
      shell.appendChild(body);
      root.appendChild(backdrop);
      root.appendChild(shell);
      document.body.appendChild(root);

      document.addEventListener('keydown', e => {
        if (!isOpen) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft' && !stagePhoto.classList.contains('hidden')) showFrame(frame - 1);
        else if (e.key === 'ArrowRight' && !stagePhoto.classList.contains('hidden')) showFrame(frame + 1);
      });
    }

    function showFrame(i) {
      frame = (i + photos.length) % photos.length;
      const src = photos[frame];

      stageImg.classList.add('is-swapping');
      const pre = new Image();
      pre.onload = () => {
        stageImg.src = src;
        stageImg.alt = `${current.title} — frame ${frame + 1} of ${photos.length}`;
        stageImg.classList.remove('is-swapping');
      };
      pre.src = src;

      /* Preload the next frame so navigation feels instant */
      if (photos.length > 1) new Image().src = photos[(frame + 1) % photos.length];

      counterEl.textContent = `Frame ${pad(frame + 1)} / ${pad(photos.length)}`;
      [...ticksWrap.children].forEach((t, ti) => t.classList.toggle('active', ti === frame));
      [...thumbsWrap.children].forEach((t, ti) => t.classList.toggle('active', ti === frame));
    }

    function setMode(mode) {
      const film = mode === 'film' && !!videoUrl;
      stagePhoto.classList.toggle('hidden', film);
      stageVideo.classList.toggle('hidden', !film);
      stillsBtn.classList.toggle('active', !film);
      filmBtn.classList.toggle('active', film);
      stillsBtn.setAttribute('aria-selected', String(!film));
      filmBtn.setAttribute('aria-selected', String(film));

      if (film && !stageVideo.firstChild) {
        const iframe = document.createElement('iframe');
        iframe.className = 'pv-iframe';
        iframe.src = videoUrl;
        iframe.title = `${current.title} — video walkthrough`;
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
        iframe.setAttribute('allowfullscreen', '');
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.loading = 'lazy';
        stageVideo.appendChild(iframe);
      }
      /* Tear the player down when leaving film mode so audio stops */
      if (!film) stageVideo.textContent = '';
    }

    function open(property, index, sourceEl) {
      if (!root) build();
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

      current = property;
      photos = safePhotos(property.photos);
      videoUrl = sanitizeVideoUrl(property.video);
      lastFocus = sourceEl || document.activeElement;

      fileEl.textContent = `Project File ${pad(index + 1)} · ${(REGION_LABELS[property.region] || '').toUpperCase()}`;
      titleEl.textContent = property.title;
      locEl.textContent = property.location;
      briefEl.textContent = property.description || '';

      chipsWrap.textContent = '';
      (Array.isArray(property.services) ? property.services : []).forEach(s => {
        chipsWrap.appendChild(el('span', 'pv-chip', String(s)));
      });

      ticksWrap.textContent = '';
      thumbsWrap.textContent = '';
      photos.forEach((src, i) => {
        ticksWrap.appendChild(el('span', 'pv-tick'));

        const thumb = el('button', 'pv-thumb');
        thumb.type = 'button';
        thumb.setAttribute('aria-label', `Show frame ${i + 1}`);
        const tImg = el('img');
        tImg.src = src;
        tImg.alt = '';
        tImg.loading = 'lazy';
        tImg.decoding = 'async';
        blurUp(tImg);
        thumb.appendChild(tImg);
        thumb.addEventListener('click', () => showFrame(i));
        thumbsWrap.appendChild(thumb);
      });

      const nav = photos.length > 1 ? '' : 'none';
      prevBtn.style.display = nav;
      nextBtn.style.display = nav;

      filmBtn.style.display = videoUrl ? '' : 'none';
      ctaLink.href = `https://wa.me/${WA_NUMBER}?text=` +
        encodeURIComponent(`Hi, I'd like to book a shoot like "${property.title}"`);

      setMode('stills');
      showFrame(0);

      root.classList.add('on');
      document.body.style.overflow = 'hidden';
      isOpen = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.add('open');
        closeBtn.focus();
      }));
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove('open');
      document.body.style.overflow = '';
      stageVideo.textContent = '';
      hideTimer = setTimeout(() => { root.classList.remove('on'); hideTimer = null; }, 600);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    return { open };
  })();

  /* ─── RENDER THE CATALOGUE ───────────────────────────────── */
  const grid = document.getElementById('portfolio-grid');
  if (grid && Array.isArray(window.PROPERTIES)) {
    const frag = document.createDocumentFragment();
    window.PROPERTIES.forEach((p, i) => {
      const card = PropertyCard(p, i);
      if (card) frag.appendChild(card);
    });
    grid.textContent = '';
    grid.appendChild(frag);
  }

})();
