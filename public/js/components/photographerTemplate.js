// Photographer Link-in-Bio theme.
// Supports photo + reel media in one auto-advancing Featured Work slider.

import { icon, verifiedBadge } from '../lib/icons.js';
import { escapeHTML, initials } from '../lib/utils.js';

const CATEGORIES = ['Weddings', 'Portraits', 'Events', 'Lifestyle'];

function mediaMarkup(item, alt = 'Featured work') {
  const url = escapeHTML(item?.url || '');
  const safeAlt = escapeHTML(alt);
  if (!url) return '';
  if (item?.type === 'video') {
    return `<video class=\"mo-photo-slide-media\" src=\"${url}\" muted playsinline loop preload=\"metadata\" aria-label=\"${safeAlt}\"></video>`;
  }
  return `<img class=\"mo-photo-slide-media\" src=\"${url}\" alt=\"${safeAlt}\" loading=\"lazy\">`;
}

function clearPreviousSlider(container) {
  if (container.__moPhotoCleanup) {
    try { container.__moPhotoCleanup(); } catch {}
    container.__moPhotoCleanup = null;
  }
}

function renderPhotographerTemplate(container, { profile, links, appearance }) {
  if (!container) return;
  clearPreviousSlider(container);

  const gallery = Array.isArray(appearance.photographerGallery) ? appearance.photographerGallery.map(item => ({
    type: item?.type === 'video' ? 'video' : 'image',
    url: item?.url || '',
    caption: item?.caption || '',
    category: item?.category || '',
  })).filter(item => item.url) : [];
  const activeLinks = (links || []).filter(l => l.enabled);
  const socials = profile.socials || {};
  const quickConnect = [
    socials.instagram && { key: 'instagram', icon: 'instagram' },
    socials.youtube && { key: 'youtube', icon: 'youtube' },
    socials.facebook && { key: 'facebook', icon: 'facebook' },
  ].filter(Boolean);

  const heroImage = gallery[0]?.url || '';
  const portfolioLink = activeLinks.find(l => /portfolio/i.test(l.title));
  const reelsOnly = gallery.length > 0 && gallery.every(item => item.type === 'video');

  container.className = container.classList.contains('phone-screen') ? 'phone-screen mo-photo' : 'mo-photo';
  container.innerHTML = `
    <div class=\"mo-photo-hero ${heroImage ? '' : 'mo-photo-hero-empty'}\">
      ${heroImage ? (gallery[0].type === 'video'
        ? `<video src=\"${escapeHTML(heroImage)}\" muted playsinline loop autoplay preload=\"metadata\"></video>`
        : `<img src=\"${escapeHTML(heroImage)}\" alt=\"${escapeHTML(`${profile.name || 'Photographer'} — featured work`)}\" loading=\"eager\">`) : ''}
      <div class=\"mo-photo-hero-veil\"></div>
    </div>

    <div class=\"mo-photo-identity\">
      <div class=\"mo-photo-avatar\" ${profile.avatarUrl ? `style=\"background-image:url('${escapeHTML(profile.avatarUrl)}')\"` : ''}>
        ${profile.avatarUrl ? '' : escapeHTML(initials(profile.name))}
        <span class=\"mo-photo-avatar-badge\" title=\"Verified\">${verifiedBadge(22)}</span>
      </div>
      <p class=\"mo-photo-kicker\">Photographer</p>
      <p class=\"mo-photo-name\">${escapeHTML(profile.name || 'Your Name')}<span class=\"mo-photo-verified-badge\" title=\"Verified\">${verifiedBadge(19)}</span></p>
      ${profile.location ? `<p class=\"mo-photo-location\">${icon('mapPin', { size: 12 })}<span>${escapeHTML(profile.location)}</span></p>` : ''}
      ${profile.bio ? `<p class=\"mo-photo-bio\">${escapeHTML(profile.bio)}</p>` : ''}
      ${quickConnect.length ? `<div class=\"mo-photo-social-row\">${quickConnect.map(s => `<span class=\"pv-link-social mo-photo-social-icon\" data-social-key=\"${s.key}\" aria-label=\"${s.key}\">${icon(s.icon, { size: 17 })}</span>`).join('')}</div>` : ''}
    </div>

    <div class=\"mo-photo-actions\">
      ${activeLinks.length ? activeLinks.map(l => `<div class=\"pv-link-custom mo-photo-action-card\"><span class=\"mo-photo-action-title\">${escapeHTML(l.title || 'Untitled')}</span>${l.description ? `<span class=\"mo-photo-action-desc\">${escapeHTML(l.description)}</span>` : ''}<span class=\"mo-photo-action-arrow\" aria-hidden=\"true\">${icon('arrowRight', { size: 15 })}</span></div>`).join('') : `<div class=\"mo-photo-empty\"><span>${icon('camera', { size: 18 })}</span><p>Add links from the Links page to show booking, portfolio and contact actions here.</p></div>`}
    </div>

    <div class=\"mo-photo-section\">
      <div class=\"mo-photo-section-head\">
        <h2>${reelsOnly ? 'Featured Reels' : 'Featured Work'}</h2>
        ${gallery.length ? `<span class=\"mo-photo-media-label\">${reelsOnly ? 'REELS ONLY' : 'PHOTOS + REELS'}</span>` : ''}
        ${portfolioLink ? `<span class=\"mo-photo-viewall\" data-view-all-link=\"${portfolioLink.id}\">View All ${icon('arrowRight', { size: 13 })}</span>` : ''}
      </div>

      ${gallery.length ? `
        <div class=\"mo-photo-categories\" role=\"group\" aria-label=\"Filter featured work\">
          <button type=\"button\" class=\"mo-photo-chip active\" data-filter=\"\">All</button>
          ${CATEGORIES.map(c => `<button type=\"button\" class=\"mo-photo-chip\" data-filter=\"${c}\">${c}</button>`).join('')}
        </div>
        <div class=\"mo-photo-slider\" data-slider>
          <div class=\"mo-photo-slider-track\" data-slider-track></div>
          ${gallery.length > 1 ? `<button type=\"button\" class=\"mo-photo-slider-arrow prev\" data-slider-prev aria-label=\"Previous featured work\">${icon('arrowLeft', { size: 18 })}</button><button type=\"button\" class=\"mo-photo-slider-arrow next\" data-slider-next aria-label=\"Next featured work\">${icon('arrowRight', { size: 18 })}</button>` : ''}
        </div>
        ${gallery.length > 1 ? `<div class=\"mo-photo-slider-meta\"><div class=\"mo-photo-slider-dots\" data-slider-dots></div><span data-slider-counter>1 / ${gallery.length}</span></div><div class=\"mo-photo-slider-progress\"><span data-slider-progress></span></div>` : ''}
      ` : `<div class=\"mo-photo-empty\"><span>${icon('camera', { size: 18 })}</span><p>Your featured work will appear here once photos or reels are added from the Appearance page.</p></div>`}
    </div>

    ${gallery.length ? `<div class=\"mo-photo-section mo-photo-categories-showcase\"><div class=\"mo-photo-section-head\"><h2>Specialties</h2></div><div class=\"mo-photo-category-pills\">${CATEGORIES.map(c => `<span class=\"mo-photo-pill\">${c}</span>`).join('')}</div></div>` : ''}

    <p class=\"mo-photo-footer\"><span>Available for bookings worldwide</span><span class=\"mo-photo-footer-brand\">Powered by Mochimo</span></p>
  `;

  const cleanupFns = [];
  const chips = container.querySelectorAll('.mo-photo-chip');
  const slider = container.querySelector('[data-slider]');
  if (slider && gallery.length) {
    const track = slider.querySelector('[data-slider-track]');
    const dotsEl = container.querySelector('[data-slider-dots]');
    const counterEl = container.querySelector('[data-slider-counter]');
    const progressEl = container.querySelector('[data-slider-progress]');
    const prevBtn = slider.querySelector('[data-slider-prev]');
    const nextBtn = slider.querySelector('[data-slider-next]');
    let visible = gallery.map((_, i) => i);
    let current = 0;
    let timer = null;
    let touchStartX = null;

    const intervalMs = 5200;

    const renderSlides = () => {
      const selected = visible.map(i => gallery[i]);
      track.innerHTML = selected.map((item, localIndex) => `
        <article class=\"mo-photo-slide\" data-slide-index=\"${localIndex}\">
          ${mediaMarkup(item, item.caption || (item.type === 'video' ? 'Featured reel' : 'Featured work'))}
          <div class=\"mo-photo-slide-shade\"></div>
          ${item.type === 'video' ? `<span class=\"mo-photo-reel-badge\">${icon('video', { size: 12 })} REEL</span><button type=\"button\" class=\"mo-photo-video-play\" data-video-toggle aria-label=\"Play reel\">${icon('play', { size: 18 })}</button>` : ''}
          ${item.caption ? `<div class=\"mo-photo-slide-caption\"><strong>${escapeHTML(item.caption)}</strong><span>${escapeHTML(item.category || 'Featured')}</span></div>` : `<div class=\"mo-photo-slide-caption\"><span>${escapeHTML(item.category || (item.type === 'video' ? 'Reel' : 'Featured'))}</span></div>`}
        </article>
      `).join('');
      track.style.transform = `translate3d(-${current * 100}%,0,0)`;

      const activeSlide = track.children[current];
      const activeVideo = activeSlide?.querySelector('video');
      if (activeVideo) {
        activeVideo.muted = true;
        activeVideo.play().catch(() => {});
      }
      track.querySelectorAll('video').forEach((video, i) => { if (i !== current) { video.pause(); video.currentTime = 0; } });

      dotsEl && (dotsEl.innerHTML = visible.map((_, i) => `<button type=\"button\" class=\"mo-photo-dot ${i === current ? 'active' : ''}\" data-dot=\"${i}\" aria-label=\"Show featured item ${i + 1}\"></button>`).join(''));
      if (counterEl) counterEl.textContent = `${current + 1} / ${Math.max(1, visible.length)}`;
      if (progressEl) progressEl.style.width = `${((current + 1) / Math.max(1, visible.length)) * 100}%`;

      track.querySelectorAll('[data-video-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const video = btn.closest('.mo-photo-slide')?.querySelector('video');
          if (!video) return;
          if (video.paused) { video.play().catch(() => {}); btn.innerHTML = icon('pause', { size: 18 }); }
          else { video.pause(); btn.innerHTML = icon('play', { size: 18 }); }
        });
      });
      dotsEl?.querySelectorAll('[data-dot]').forEach(dot => dot.addEventListener('click', () => { current = Number(dot.dataset.dot); renderSlides(); restart(); }));
    };

    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const restart = () => { stop(); if (visible.length > 1) timer = setInterval(() => { current = (current + 1) % visible.length; renderSlides(); }, intervalMs); };
    const move = (dir) => { if (visible.length < 2) return; current = (current + dir + visible.length) % visible.length; renderSlides(); restart(); };

    prevBtn?.addEventListener('click', () => move(-1));
    nextBtn?.addEventListener('click', () => move(1));
    const onTouchStart = e => { touchStartX = e.touches?.[0]?.clientX ?? null; };
    const onTouchEnd = e => {
      if (touchStartX == null) return;
      const x = e.changedTouches?.[0]?.clientX ?? touchStartX;
      const dx = x - touchStartX;
      if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
      touchStartX = null;
    };
    slider.addEventListener('touchstart', onTouchStart, { passive: true });
    slider.addEventListener('touchend', onTouchEnd, { passive: true });
    cleanupFns.push(() => slider.removeEventListener('touchstart', onTouchStart), slider.removeEventListener('touchend', onTouchEnd));

    const applyFilter = filter => {
      visible = gallery.map((item, i) => ({ item, i })).filter(({ item }) => !filter || item.category === filter).map(({ i }) => i);
      current = 0;
      renderSlides();
      restart();
    };
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(chip.dataset.filter || '');
    }));

    renderSlides();
    restart();
    cleanupFns.push(stop);
  }

  const viewAllEl = container.querySelector('[data-view-all-link]');
  // Navigation wiring is handled by publicProfile.js for actual pages.
  // Here we only keep the element visual/interactive in dashboard preview.
  if (viewAllEl) viewAllEl.style.cursor = 'default';

  container.__moPhotoCleanup = () => cleanupFns.forEach(fn => { try { fn(); } catch {} });
}

export { renderPhotographerTemplate };
