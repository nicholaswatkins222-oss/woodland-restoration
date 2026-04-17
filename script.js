/* ============================================================
   WOODLAND RESTORATION LLC — script.js
   ============================================================ */

(function () {
  'use strict';

  // ── Navbar: shrink on scroll ──────────────────────────────
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // ── Mobile Menu toggle ────────────────────────────────────
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu__close');

  function openMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close on backdrop click
  if (mobileMenu) {
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMenu();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
      closeMenu();
      hamburger && hamburger.focus();
    }
  });

  // ── Active nav link highlighting ──────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__nav a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // ── Reveal animations (IntersectionObserver) ─────────────
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  // ── Gallery filter tabs ───────────────────────────────────
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Update active state + aria-pressed
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        // Filter items
        galleryItems.forEach(item => {
          if (filter === 'all' || item.dataset.category === filter) {
            item.classList.remove('hidden');
            // Re-trigger reveal on newly visible items
            setTimeout(() => item.classList.add('visible'), 20);
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

  // ── Contact page: auto-fill service from URL param ────────
  // e.g. contact.html?service=fencing → pre-selects the fencing-residential option
  const serviceSelect = document.getElementById('service');
  if (serviceSelect) {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    if (serviceParam) {
      const paramMap = {
        'decks':             'deck',
        'fencing':           'fencing-residential',
        'fencing-commercial':'fencing-commercial',
        'gates':             'gate',
        'pergolas':          'pergola',
        'site-work':         'site-work',
      };
      const targetValue = paramMap[serviceParam];
      if (targetValue) {
        serviceSelect.value = targetValue;
      }
    }
  }

  // ── Contact form submission ───────────────────────────────
  const form = document.getElementById('contact-form');
  const successMsg = document.getElementById('form-success');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.innerHTML;

      // Simple client-side validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#c0392b';
          valid = false;
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) return;

      // Loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending…';

      try {
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());

        const WEBHOOK_URL = 'https://nicholaswatkins.app.n8n.cloud/webhook/woodland-contact';

        if (WEBHOOK_URL) {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        // Show success
        form.reset();
        form.style.display = 'none';
        if (successMsg) successMsg.style.display = 'flex';

      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        alert('Something went wrong. Please call or email us directly.');
      }
    });

    // Clear red border on input
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => {
        field.style.borderColor = '';
      });
    });
  }

  // ── Google Reviews: live fetch from Places API (New) ─────
  async function loadGoogleReviews() {
    const section = document.querySelector('.google-reviews-section');
    if (!section) return;

    const apiKey  = section.dataset.apiKey;
    const mapsUrl = section.dataset.mapsUrl;

    // Skip if placeholder hasn't been replaced yet
    if (!apiKey || apiKey === 'API_KEY_HERE') return;

    // Always wire up "See all reviews" link — independent of API success
    const viewAllLink = section.querySelector('.google-view-all');
    if (viewAllLink && mapsUrl) viewAllLink.href = mapsUrl;

    try {
      // Step 1: Text search → get Place ID + rating + review count
      const searchRes = await fetch(
        `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'places.id,places.rating,places.userRatingCount'
          },
          body: JSON.stringify({ textQuery: 'Woodland Restoration LLC Hebron Indiana' })
        }
      );
      if (!searchRes.ok) return;

      const searchJson = await searchRes.json();
      const place = searchJson.places && searchJson.places[0];
      if (!place) return;

      // Update overall rating + count
      const scoreEl = section.querySelector('.google-overall-rating__score');
      const countEl = section.querySelector('.google-overall-rating__count');

      if (scoreEl && place.rating != null) {
        scoreEl.textContent = place.rating.toFixed(1);
      }
      if (countEl && place.userRatingCount != null) {
        countEl.textContent = `based on ${place.userRatingCount} reviews`;
      }
      if (viewAllLink && place.userRatingCount != null) {
        viewAllLink.innerHTML = viewAllLink.innerHTML.replace(/See all \d+ reviews/, `See all ${place.userRatingCount} reviews`);
      }

      // Step 2: Place Details → get reviews (only available here, not in searchText)
      const detailsRes = await fetch(
        `https://places.googleapis.com/v1/places/${place.id}?key=${apiKey}`,
        { headers: { 'X-Goog-FieldMask': 'reviews' } }
      );
      if (!detailsRes.ok) return;

      const detailsJson = await detailsRes.json();
      const data = detailsJson;

      // Rebuild review cards
      if (!data.reviews || data.reviews.length === 0) return;

      const starsSVG = `<svg width="12" height="12" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>`;

      const delayClasses = ['', ' reveal-delay-1', ' reveal-delay-2', ' reveal-delay-3'];
      const cards = data.reviews.slice(0, 4).map((review, i) => {
        const name   = review.authorAttribution?.displayName || 'Google User';
        const initial = name.charAt(0).toUpperCase();
        const date   = review.relativePublishTimeDescription || '';
        const rating = review.rating || 5;
        const text   = review.text?.text || '';
        const stars  = Array.from({ length: rating }, () =>
          '<i class="fa-solid fa-star" aria-hidden="true"></i>').join('');

        return `
        <div class="google-review-card reveal${delayClasses[i]}">
          <div class="google-review-card__top">
            <div class="google-review-card__avatar" aria-hidden="true">${initial}</div>
            <div>
              <div class="google-review-card__name">${name}</div>
              <div class="google-review-card__date">${date}</div>
            </div>
          </div>
          <div class="google-review-card__stars" aria-label="${rating} out of 5 stars">${stars}</div>
          <p class="google-review-card__text">"${text}"</p>
          <div class="google-review-card__footer" aria-hidden="true">
            ${starsSVG}
            <span>Google Review</span>
          </div>
        </div>`;
      });

      const grid = section.querySelector('.google-reviews-grid');
      if (grid) {
        grid.innerHTML = cards.join('');
        // Re-run reveal observer on new cards
        const newCards = grid.querySelectorAll('.reveal');
        if (newCards.length > 0) {
          const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
              }
            });
          }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
          newCards.forEach(el => obs.observe(el));
        }
      }

    } catch (err) {
      console.error('[Google Reviews] fetch failed:', err);
    }
  }

  loadGoogleReviews();

  // ── Smooth scroll for anchor links ───────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = (navbar ? navbar.offsetHeight : 80) + 24;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
