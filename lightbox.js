/**
 * KHC Portfolio Lightbox
 * Handles click-to-expand for images and videos across project pages and modals.
 * Usage: any <img> or <video> with data-lightbox attribute becomes clickable.
 * Auto-initializes on DOMContentLoaded and re-initializes when modal opens.
 */

(function () {

  // ── CREATE LIGHTBOX DOM ──────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';
  overlay.innerHTML = `
    <div id="lb-inner">
      <button id="lb-close" aria-label="Close">✕</button>
      <button id="lb-prev" aria-label="Previous">&#8592;</button>
      <button id="lb-next" aria-label="Next">&#8594;</button>
      <div id="lb-img-wrap">
        <div id="lb-slide-track">
          <div id="lb-slot-prev" class="lb-slot"></div>
          <div id="lb-slot-curr" class="lb-slot">
            <img id="lb-img" src="" alt="" style="display:none;">
            <video id="lb-vid" autoplay loop playsinline style="display:none;"></video>
          </div>
          <div id="lb-slot-next" class="lb-slot"></div>
        </div>
        <div id="lb-caption"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── STYLES ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #lb-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      padding: 2rem;
    }
    #lb-overlay.active {
      opacity: 1;
      pointer-events: all;
    }
    #lb-inner {
      position: relative;
      max-width: 92vw;
      max-height: 92vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #lb-img-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    #lb-img, #lb-vid {
      max-width: 90vw;
      max-height: 85vh;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
      border: 1px solid rgba(255,255,255,0.1);
    }
    #lb-caption {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.4);
      text-align: center;
      text-transform: uppercase;
      max-width: 600px;
      line-height: 1.5;
    }
    #lb-close {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      width: 40px;
      height: 40px;
      background: rgba(14,13,12,0.9);
      border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.6);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      font-family: 'IBM Plex Mono', monospace;
      line-height: 1;
      z-index: 2001;
    }
    #lb-close:hover { border-color: #e8870a; color: #e8870a; }
    #lb-prev, #lb-next {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      background: rgba(14,13,12,0.85);
      border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.6);
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      z-index: 2001;
    }
    #lb-prev { left: 1rem; }
    #lb-next { right: 1rem; }
    #lb-prev:hover, #lb-next:hover { border-color: #e8870a; color: #e8870a; }
    #lb-prev.hidden, #lb-next.hidden { opacity: 0; pointer-events: none; }
    #lb-img-wrap {
      overflow: hidden;
      position: relative;
    }
    #lb-slide-track {
      display: flex;
      width: 300%;
      transform: translateX(-33.333%);
      transition: none;
      will-change: transform;
    }
    #lb-slide-track.animating {
      transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .lb-slot {
      width: 33.333%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60px;
    }
    .lb-slot img, .lb-slot video {
      max-width: 90vw;
      max-height: 85vh;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
    }
    img[data-lightbox], video[data-lightbox] {
      cursor: zoom-in;
      transition: transform 0.4s ease;
      will-change: transform;
    }
    img[data-lightbox]:not(.lb-wrapped):hover {
      transform: scale(1.025);
    }
    .lb-zoom-outer {
      overflow: hidden;
      display: block;
      line-height: 0;
    }
    .lb-zoom-wrap {
      display: block;
      line-height: 0;
      transition: transform 0.4s ease;
      cursor: zoom-in;
    }
    .lb-zoom-wrap:not(.lb-video-wrap):hover {
      transform: scale(1.025);
    }
    @media (max-width: 600px) {
      #lb-prev { left: 0.25rem; }
      #lb-next { right: 0.25rem; }
      #lb-close { top: 0.75rem; right: 0.75rem; }
    }
  `;
  document.head.appendChild(style);

  // ── STATE ────────────────────────────────────────────────────────────────
  let currentIndex = 0;
  let currentGroup = [];

  // ── RENDER ───────────────────────────────────────────────────────────────
  function buildSlotContent(slot, entry) {
    slot.innerHTML = '';
    if (!entry) return;
    if (entry.type === 'youtube') {
      const frame = document.createElement('iframe');
      const startParam = entry.startTime ? `&start=${entry.startTime}` : '';
      frame.src = `https://www.youtube.com/embed/${entry.youtubeId}?autoplay=0&rel=0${startParam}`;
      frame.allow = 'autoplay; encrypted-media; fullscreen';
      frame.allowFullscreen = true;
      frame.style.cssText = 'width:90vw;max-width:1200px;aspect-ratio:16/9;border:1px solid rgba(255,255,255,0.1);display:block;';
      slot.appendChild(frame);
    } else if (entry.type === 'video') {
      const vid = document.createElement('video');
      vid.autoplay = false;
      vid.loop = true;
      vid.playsInline = true;
      vid.muted = false;
      vid.src = entry.src;
      vid.style.cssText = 'max-width:90vw;max-height:85vh;border:1px solid rgba(255,255,255,0.1);display:block;';
      slot.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.src = entry.src;
      img.alt = entry.alt || '';
      img.style.cssText = 'max-width:90vw;max-height:85vh;border:1px solid rgba(255,255,255,0.1);display:block;';
      slot.appendChild(img);
    }
  }

  function renderItem(animate) {
    const caption = document.getElementById('lb-caption');
    const prev = document.getElementById('lb-prev');
    const next = document.getElementById('lb-next');
    const track = document.getElementById('lb-slide-track');
    const slotPrev = document.getElementById('lb-slot-prev');
    const slotCurr = document.getElementById('lb-slot-curr');
    const slotNext = document.getElementById('lb-slot-next');
    const entry = currentGroup[currentIndex];

    caption.textContent = entry.caption || entry.alt || '';
    prev.classList.toggle('hidden', currentIndex === 0);
    next.classList.toggle('hidden', currentIndex === currentGroup.length - 1);

    buildSlotContent(slotPrev, currentGroup[currentIndex - 1] || null);
    buildSlotContent(slotCurr, entry);
    buildSlotContent(slotNext, currentGroup[currentIndex + 1] || null);

    // Play video in current slot if present
    const currVid = slotCurr.querySelector('video');
    if (currVid) { currVid.load(); currVid.play(); }

    // Reset track position instantly
    track.classList.remove('animating');
    track.style.transform = 'translateX(-33.333%)';
  }

  function slideToIndex(newIndex) {
    if (newIndex < 0 || newIndex >= currentGroup.length) return;
    const track = document.getElementById('lb-slide-track');
    const direction = newIndex > currentIndex ? -1 : 1;
    const targetX = direction > 0 ? 0 : -66.666;

    track.classList.add('animating');
    track.style.transform = `translateX(${targetX}%)`;

    track.addEventListener('transitionend', function handler() {
      track.removeEventListener('transitionend', handler);
      currentIndex = newIndex;
      renderItem();
    }, { once: true });
  }

  // ── OPEN / CLOSE ─────────────────────────────────────────────────────────
  function openLightbox(group, index) {
    currentGroup = group;
    currentIndex = index;
    // Hide legacy single-slot elements (now slot-managed)
    const lbImg = document.getElementById('lb-img');
    const lbVid = document.getElementById('lb-vid');
    if (lbImg) lbImg.style.display = 'none';
    if (lbVid) lbVid.style.display = 'none';
    renderItem();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!overlay.classList.contains('active')) {
        const lbImg = document.getElementById('lb-img');
        const lbVid = document.getElementById('lb-vid');
        lbImg.src = '';
        lbVid.pause();
        lbVid.src = '';
        const ytFrame = document.getElementById('lb-yt-frame');
        if (ytFrame) ytFrame.remove();
      }
    }, 250);
  }

  // ── NAVIGATION ───────────────────────────────────────────────────────────
  document.getElementById('lb-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) slideToIndex(currentIndex - 1);
  });
  document.getElementById('lb-next').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < currentGroup.length - 1) slideToIndex(currentIndex + 1);
  });
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'lb-inner') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentIndex > 0) slideToIndex(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < currentGroup.length - 1) slideToIndex(currentIndex + 1);
  });

  // ── TOUCH SWIPE WITH FOLLOW ANIMATION ───────────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;
  let isDragging = false;

  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
    const track = document.getElementById('lb-slide-track');
    if (track) track.classList.remove('animating');
  }, { passive: true });

  overlay.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const track = document.getElementById('lb-slide-track');
    if (!track) return;
    const dragPct = (dx / window.innerWidth) * 100;
    track.style.transform = `translateX(${-33.333 + dragPct}%)`;
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const track = document.getElementById('lb-slide-track');
    if (!track) return;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) {
      track.classList.add('animating');
      track.style.transform = 'translateX(-33.333%)';
      return;
    }
    if (dx < 0 && currentIndex < currentGroup.length - 1) slideToIndex(currentIndex + 1);
    else if (dx > 0 && currentIndex > 0) slideToIndex(currentIndex - 1);
    else {
      track.classList.add('animating');
      track.style.transform = 'translateX(-33.333%)';
    }
  }, { passive: true });


  // ── INIT ─────────────────────────────────────────────────────────────────
  function initLightbox() {
    const elements = document.querySelectorAll('img[data-lightbox], video[data-lightbox]');
    const groups = {};

    // Wrap grid-child imgs/videos: outer div clips, inner div scales
    elements.forEach(el => {
      if (el.tagName !== 'IMG' && el.tagName !== 'VIDEO') return;
      const parent = el.parentElement;
      if (parent.classList.contains('lb-zoom-wrap')) return; // already wrapped
      const parentDisplay = window.getComputedStyle(parent).display;
      const parentOverflow = window.getComputedStyle(parent).overflow;
      if (parentDisplay === 'grid' || parentDisplay === 'inline-grid' || parentOverflow !== 'hidden') {
        const outer = document.createElement('div');
        outer.className = 'lb-zoom-outer';
        const inner = document.createElement('div');
        inner.className = 'lb-zoom-wrap';
        outer.appendChild(inner);
        parent.insertBefore(outer, el);
        inner.appendChild(el);
        if (el.tagName === 'IMG') el.classList.add('lb-wrapped');
        if (el.tagName === 'VIDEO') inner.classList.add('lb-video-wrap');
      }
    });

    elements.forEach(el => {
      const group = el.getAttribute('data-lightbox');
      if (!groups[group]) groups[group] = [];
      const isVideo = el.tagName === 'VIDEO';
      const src = isVideo
        ? (el.querySelector('source')?.src || el.currentSrc || el.src)
        : el.src;
      const youtubeId = el.getAttribute('data-youtube') || null;
      const startTime = el.getAttribute('data-yt-start') || null;
      groups[group].push({
        src,
        alt: el.getAttribute('alt') || '',
        caption: el.getAttribute('data-caption') || el.getAttribute('alt') || '',
        type: youtubeId ? 'youtube' : (isVideo ? 'video' : 'image'),
        youtubeId,
        startTime
      });
    });

    elements.forEach(el => {
      el.removeEventListener('click', el._lbHandler);
      el._lbHandler = function () {
        const group = el.getAttribute('data-lightbox');
        const groupItems = groups[group];
        const isVideo = el.tagName === 'VIDEO';
        const src = isVideo
          ? (el.querySelector('source')?.src || el.currentSrc || el.src)
          : el.src;
        const youtubeId = el.getAttribute('data-youtube') || null;
        const index = youtubeId
          ? groupItems.findIndex(entry => entry.youtubeId === youtubeId)
          : groupItems.findIndex(entry => entry.src === src);
        openLightbox(groupItems, index >= 0 ? index : 0);
      };
      el.addEventListener('click', el._lbHandler);
    });
  }

  document.addEventListener('DOMContentLoaded', initLightbox);
  window.lbInit = initLightbox;

})();
