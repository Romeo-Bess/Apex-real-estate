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

  const WA_NUMBER = '27821234567';

  /* Card tag shows the suburb — the part of `location` before the comma */
  const suburbOf = p => String(p.location || '').split(',')[0].trim() || 'Cape Town';

  /* Property types drive the filter tabs. Order fixes tab order;
     only types that exist in the data get a button. */
  const TYPE_ORDER = ['house', 'villa', 'apartment', 'estate'];
  const TYPE_LABELS = { house: 'Houses', villa: 'Villas', apartment: 'Apartments', estate: 'Estates' };
  const TYPE_SINGULAR = { house: 'House', villa: 'Villa', apartment: 'Apartment', estate: 'Estate' };

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

  /* Local walkthrough files (e.g. AI-generated clips dropped in /videos)
     play in the native player; external URLs become sandboxed embeds. */
  const SAFE_VIDEO_FILE = /^videos\/[A-Za-z0-9._-]+\.(?:mp4|webm)$/i;

  function resolveVideo(raw) {
    if (typeof raw !== 'string' || raw === '') return null;
    if (SAFE_VIDEO_FILE.test(raw)) return { kind: 'file', src: raw };
    const embed = sanitizeVideoUrl(raw);
    return embed ? { kind: 'embed', src: embed } : null;
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
    card.dataset.category = property.type || 'property';
    card.setAttribute('aria-label', `Open project: ${property.title}, ${property.location}`);

    const img = el('img');
    img.src = photos[0];
    img.alt = `${property.title} — ${property.location}`;
    img.loading = property.featured ? 'eager' : 'lazy';
    if (property.featured) img.setAttribute('fetchpriority', 'high');
    img.decoding = 'async';
    blurUp(img);

    const scrim = el('div', 'card-scrim');

    const badges = el('div', 'card-badges');
    badges.appendChild(el('span', 'card-type', TYPE_SINGULAR[property.type] || 'Property'));
    if (resolveVideo(property.video)) {
      badges.appendChild(el('span', 'portfolio-film-badge', '▸ Film'));
    }

    const info = el('div', 'card-info');
    info.appendChild(el('h3', 'card-title', property.title));
    info.appendChild(el('p', 'card-sub', `${suburbOf(property)} · ${photos.length} Frames`));

    card.appendChild(img);
    card.appendChild(scrim);
    card.appendChild(badges);
    card.appendChild(info);

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

    let photos = [], frame = 0, video = null, current = null;
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
      const film = mode === 'film' && !!video;
      stagePhoto.classList.toggle('hidden', film);
      stageVideo.classList.toggle('hidden', !film);
      stillsBtn.classList.toggle('active', !film);
      filmBtn.classList.toggle('active', film);
      stillsBtn.setAttribute('aria-selected', String(!film));
      filmBtn.setAttribute('aria-selected', String(film));

      if (film && !stageVideo.firstChild) {
        if (video.kind === 'file') {
          /* Local walkthrough — native player, no third-party branding */
          const player = document.createElement('video');
          player.className = 'pv-player';
          player.src = video.src;
          player.controls = true;
          player.playsInline = true;
          player.preload = 'metadata';
          player.setAttribute('controlslist', 'nodownload');
          stageVideo.appendChild(player);
        } else {
          const iframe = document.createElement('iframe');
          iframe.className = 'pv-iframe';
          iframe.src = video.src;
          iframe.title = `${current.title} — video walkthrough`;
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
          iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
          iframe.setAttribute('allowfullscreen', '');
          iframe.referrerPolicy = 'strict-origin-when-cross-origin';
          iframe.loading = 'lazy';
          stageVideo.appendChild(iframe);
        }
      }
      /* Tear the player down when leaving film mode so audio stops */
      if (!film) stageVideo.textContent = '';
    }

    function open(property, index, sourceEl) {
      if (!root) build();
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

      current = property;
      photos = safePhotos(property.photos);
      video = resolveVideo(property.video);
      lastFocus = sourceEl || document.activeElement;

      fileEl.textContent = `Project File ${pad(index + 1)} · ${TYPE_SINGULAR[property.type] || 'Property'} · Cape Town`;
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

      filmBtn.style.display = video ? '' : 'none';
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

  /* ─── HERO VIDEO (optional) ──────────────────────────────
     If SITE_MEDIA.heroVideo names a local file, a muted looping
     film fades in over the hero slideshow. The slideshow keeps
     running underneath, so a missing file, a failed load or a
     blocked autoplay silently falls back to it. */
  const heroWrap = document.getElementById('hero-slideshow');
  const heroSrc = (window.SITE_MEDIA || {}).heroVideo;
  if (heroWrap && typeof heroSrc === 'string' && SAFE_VIDEO_FILE.test(heroSrc)) {
    const heroVid = document.createElement('video');
    heroVid.className = 'hero-video';
    heroVid.muted = true;
    heroVid.loop = true;
    heroVid.autoplay = true;
    heroVid.playsInline = true;
    heroVid.setAttribute('muted', '');       /* iOS needs the attribute form */
    heroVid.setAttribute('playsinline', '');
    heroVid.setAttribute('aria-hidden', 'true');
    heroVid.preload = 'auto';
    heroVid.src = heroSrc;
    /* Fade in only once frames are actually advancing — if autoplay is
       blocked the video stays invisible and the slideshow runs instead */
    heroVid.addEventListener('playing', () => heroVid.classList.add('is-playing'), { once: true });
    heroVid.addEventListener('error', () => heroVid.remove(), { once: true });
    heroWrap.appendChild(heroVid);
    const played = heroVid.play();
    if (played && typeof played.catch === 'function') played.catch(() => {});
  }

  /* ─── RENDER THE CATALOGUE ───────────────────────────────── */
  const grid = document.getElementById('portfolio-grid');
  if (grid && (!Array.isArray(window.PROPERTIES) || !window.PROPERTIES.length)) {
    /* properties.js failed to load — never leave the section silently empty */
    grid.appendChild(el('p', 'catalogue-fallback',
      'The property showcase could not be loaded. Please refresh the page, or contact us on WhatsApp to receive our portfolio directly.'));
  }
  if (grid && Array.isArray(window.PROPERTIES) && window.PROPERTIES.length) {
    const frag = document.createDocumentFragment();
    window.PROPERTIES.forEach((p, i) => {
      const card = PropertyCard(p, i);
      if (card) frag.appendChild(card);
    });
    grid.textContent = '';
    grid.appendChild(frag);

    /* ─── TYPE FILTER TABS ───────────────────────────────────
       Derived from the data — a new `type` in properties.js gets
       a tab automatically. The buttons exist before script.js
       loads, so its existing filter logic (show/hide by
       data-category) binds to them unchanged; the listener here
       only adds the staggered re-entrance animation. */
    const filters = document.getElementById('portfolio-filters');
    if (filters) {
      const counts = {};
      window.PROPERTIES.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });

      const replay = () => requestAnimationFrame(() => {
        grid.classList.remove('replay');
        void grid.offsetWidth; /* restart the CSS animation */
        grid.classList.add('replay');
      });

      const makeBtn = (filter, label, count, active) => {
        const btn = el('button', 'filter-btn' + (active ? ' active' : ''));
        btn.type = 'button';
        btn.dataset.filter = filter;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', String(active));
        btn.setAttribute('aria-controls', 'portfolio-grid');
        btn.appendChild(el('span', null, label));
        btn.appendChild(el('span', 'filter-count', pad(count)));
        btn.addEventListener('click', replay);
        return btn;
      };

      filters.textContent = '';
      filters.appendChild(makeBtn('all', 'All Properties', window.PROPERTIES.length, true));
      TYPE_ORDER.filter(t => counts[t]).forEach(t => {
        filters.appendChild(makeBtn(t, TYPE_LABELS[t], counts[t], false));
      });
    }
  }

})();
