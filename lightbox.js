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
      <button id="lb-prev" aria-label="Previous">&#8249;</button>
      <button id="lb-next" aria-label="Next">&#8250;</button>
      <div id="lb-img-wrap">
        <img id="lb-img" src="" alt="" style="display:none;">
        <video id="lb-vid" autoplay loop playsinline style="display:none;"></video>
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
      transform: scale(0.96);
      transition: transform 0.2s ease;
      border: 1px solid rgba(255,255,255,0.1);
    }
    #lb-overlay.active #lb-img,
    #lb-overlay.active #lb-vid {
      transform: scale(1);
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
      width: 36px;
      height: 36px;
      background: rgba(30,28,26,0.88);
      border: none;
      border-radius: 50%;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.15s;
      line-height: 1;
      z-index: 2001;
      padding: 0;
    }
    #lb-close:hover { background: rgba(50,48,46,0.95); transform: scale(1.1); }
    #lb-prev, #lb-next {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      background: rgba(20,18,16,0.45);
      border: none;
      border-radius: 50%;
      color: rgba(255,255,255,0.9);
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.15s;
      z-index: 2001;
      padding: 0;
      user-select: none;
    }
    #lb-prev { left: 0.75rem; }
    #lb-next { right: 0.75rem; }
    #lb-prev:hover { background: rgba(30,28,26,0.75); transform: translateY(-50%) scale(1.1); }
    #lb-next:hover { background: rgba(30,28,26,0.75); transform: translateY(-50%) scale(1.1); }
    #lb-prev.hidden, #lb-next.hidden { opacity: 0; pointer-events: none; }
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
      #lb-close {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      width: 36px;
      height: 36px;
      background: rgba(30,28,26,0.88);
      border: none;
      border-radius: 50%;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.15s;
      line-height: 1;
      z-index: 2001;
      padding: 0;
    }
    }
  `;
  document.head.appendChild(style);

  // ── STATE ────────────────────────────────────────────────────────────────
  let currentIndex = 0;
  let currentGroup = [];

  // ── RENDER ───────────────────────────────────────────────────────────────
  function renderItem() {
    const lbImg = document.getElementById('lb-img');
    const lbVid = document.getElementById('lb-vid');
    const caption = document.getElementById('lb-caption');
    const prev = document.getElementById('lb-prev');
    const next = document.getElementById('lb-next');
    const entry = currentGroup[currentIndex];

    caption.textContent = entry.caption || '';
    prev.classList.toggle('hidden', currentIndex === 0);
    next.classList.toggle('hidden', currentIndex === currentGroup.length - 1);

    // Remove any previous YouTube iframe
    const prevFrame = document.getElementById('lb-yt-frame');
    if (prevFrame) prevFrame.remove();

    if (entry.type === 'youtube') {
      lbImg.style.display = 'none';
      lbImg.src = '';
      lbVid.style.display = 'none';
      lbVid.pause();
      lbVid.src = '';
      const frame = document.createElement('iframe');
      frame.id = 'lb-yt-frame';
      const startParam = entry.startTime ? `&start=${entry.startTime}` : '';
      frame.src = `https://www.youtube.com/embed/${entry.youtubeId}?autoplay=1&rel=0${startParam}`;
      frame.allow = 'autoplay; encrypted-media; fullscreen';
      frame.allowFullscreen = true;
      frame.style.cssText = 'width:90vw;max-width:1200px;aspect-ratio:16/9;border:1px solid rgba(255,255,255,0.1);display:block;';
      lbImg.parentNode.insertBefore(frame, lbImg);
    } else if (entry.type === 'video') {
      lbImg.style.display = 'none';
      lbImg.src = '';
      lbVid.style.display = 'block';
      lbVid.muted = false;
      lbVid.src = entry.src;
      lbVid.load();
      lbVid.play();
    } else {
      lbVid.style.display = 'none';
      lbVid.pause();
      lbVid.src = '';
      lbImg.style.display = 'block';
      lbImg.src = entry.src;
      lbImg.alt = entry.alt || '';
    }
  }

  // ── OPEN / CLOSE ─────────────────────────────────────────────────────────
  function openLightbox(group, index) {
    currentGroup = group;
    currentIndex = index;
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
    if (currentIndex > 0) { currentIndex--; renderItem(); }
  });
  document.getElementById('lb-next').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < currentGroup.length - 1) { currentIndex++; renderItem(); }
  });
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'lb-inner') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; renderItem(); }
    if (e.key === 'ArrowRight' && currentIndex < currentGroup.length - 1) { currentIndex++; renderItem(); }
  });

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
        caption: el.getAttribute('data-caption') || '',
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
