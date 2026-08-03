(function () {
    'use strict';

    function initAnnouncementCarousel(root) {
      var slides = Array.prototype.slice.call(root.querySelectorAll('.bar_slide'));
      if (slides.length === 0) return;

      var prevBtn = root.querySelector('[data-carousel-prev]');
      var nextBtn = root.querySelector('[data-carousel-next]');
      var toggleBtn = root.querySelector('[data-carousel-toggle]');
      var statusEl = root.querySelector('[data-carousel-status]');

      var autoplayEnabled = root.getAttribute('data-autoplay') === 'true';
      var speed = parseInt(root.getAttribute('data-speed'), 10) || 5000;
      var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var current = 0;
      var timer = null;
      var isPlaying = autoplayEnabled && slides.length > 1 && !prefersReducedMotion;

      function announce(text) {
        if (statusEl) statusEl.textContent = text;
      }

      function goTo(index, opts) {
        var silent = opts && opts.silent;
        var prevIndex = current;
        current = (index + slides.length) % slides.length;

        slides[prevIndex].classList.remove('is-active');
        slides[prevIndex].setAttribute('aria-hidden', 'true');
        slides[prevIndex].setAttribute('tabindex', '-1');

        slides[current].classList.add('is-active');
        slides[current].setAttribute('aria-hidden', 'false');
        slides[current].setAttribute('tabindex', '0');

        if (!silent) {
          announce((slides[current].textContent || '').trim());
        }
      }

      function next() { goTo(current + 1); }
      function prev() { goTo(current - 1); }

      function play() {
        if (slides.length <= 1 || prefersReducedMotion) return;
        stop();
        timer = window.setInterval(next, speed);
        isPlaying = true;
        if (statusEl) statusEl.setAttribute('aria-live', 'off');
        if (toggleBtn) {
          toggleBtn.setAttribute('data-playing', 'true');
          toggleBtn.setAttribute('aria-pressed', 'true');
          toggleBtn.setAttribute('aria-label', 'Pause announcements');
        }
      }

      function stop() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
        isPlaying = false;
        if (statusEl) statusEl.setAttribute('aria-live', 'polite');
        if (toggleBtn) {
          toggleBtn.setAttribute('data-playing', 'false');
          toggleBtn.setAttribute('aria-pressed', 'false');
          toggleBtn.setAttribute('aria-label', 'Play announcements');
        }
      }

      if (nextBtn) nextBtn.addEventListener('click', function () { stop(); next(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { stop(); prev(); });
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          if (isPlaying) { stop(); } else { play(); }
        });
      }

      // Keyboard support when carousel region has focus
      root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { stop(); next(); }
        if (e.key === 'ArrowLeft') { stop(); prev(); }
      });

      // Pause on hover / focus, resume on mouse leave / blur
      root.addEventListener('mouseenter', function () { if (autoplayEnabled) stop(); });
      root.addEventListener('mouseleave', function () { if (autoplayEnabled && !prefersReducedMotion) play(); });
      root.addEventListener('focusin', function () { if (autoplayEnabled) stop(); });
      root.addEventListener('focusout', function (e) {
        if (autoplayEnabled && !prefersReducedMotion && !root.contains(e.relatedTarget)) play();
      });

      // Pause when tab is not visible
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          stop();
        } else if (autoplayEnabled && !prefersReducedMotion) {
          play();
        }
      });

      goTo(0, { silent: true });
      if (isPlaying) play();

      // Theme editor: pause + reveal the slide being edited
      root.__announcementApi = { goTo: goTo, stop: stop, play: play };
    }

    function initAll(context) {
      var carousels = (context || document).querySelectorAll('[data-announcement-carousel]');
      carousels.forEach(function (el) {
        if (!el.__announcementInitialized) {
          el.__announcementInitialized = true;
          initAnnouncementCarousel(el);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initAll(document); });
    } else {
      initAll(document);
    }

    // Shopify theme editor integration
    document.addEventListener('shopify:section:load', function (event) {
      initAll(event.target);
    });

    document.addEventListener('shopify:block:select', function (event) {
      var blockEl = event.target;
      var carousel = blockEl.closest('[data-announcement-carousel]') ||
        (blockEl.querySelector ? blockEl.querySelector('[data-announcement-carousel]') : null);
      var section = blockEl.closest('[class*="announcement-bar-"]');
      if (section) {
        var carouselInSection = section.querySelector('[data-announcement-carousel]');
        if (carouselInSection && carouselInSection.__announcementApi) {
          var slideEl = section.querySelector('#' + blockEl.id + '') || blockEl;
          var index = Array.prototype.indexOf.call(
            carouselInSection.querySelectorAll('.bar_slide'),
            slideEl
          );
          carouselInSection.__announcementApi.stop();
          if (index > -1) carouselInSection.__announcementApi.goTo(index);
        }
      }
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var section = event.target.closest('[class*="announcement-bar-"]');
      if (section) {
        var carouselInSection = section.querySelector('[data-announcement-carousel]');
        if (carouselInSection && carouselInSection.getAttribute('data-autoplay') === 'true') {
          carouselInSection.__announcementApi.play();
        }
      }
    });
  })();
