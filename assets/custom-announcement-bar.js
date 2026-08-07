(function () {
  'use strict';

  const SELECTORS = {
    root: '[data-announcement-carousel]',
    slide: '.bar_slide',
    prev: '[data-carousel-prev]',
    next: '[data-carousel-next]',
    toggle: '[data-carousel-toggle]',
    status: '[data-carousel-status]',
    section: '[class*="announcement-bar-"]',
  };

  const ATTRIBUTES = {
    autoplay: 'data-autoplay',
    speed: 'data-speed',
  };

  const CLASSES = {
    active: 'is-active',
  };

  const KEYS = {
    NEXT: 'ArrowRight',
    PREV: 'ArrowLeft',
  };

  const ARIA_LIVE = {
    playing: 'off',
    paused: 'polite',
  };

  const TOGGLE_LABEL = {
    playing: 'Pause announcements',
    paused: 'Play announcements',
  };

  const DEFAULT_SPEED = 5000;
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  class AnnouncementCarousel {
    static ROOT_SELECTOR = SELECTORS.root;
    static INSTANCE_KEY = 'announcementCarousel';

    constructor(root) {
      this.root = root;
      this.slides = Array.from(root.querySelectorAll(SELECTORS.slide));

      // Mark the element as initialized immediately, even if there are no
      // slides to operate on, mirroring the original "already handled" guard.
      root[AnnouncementCarousel.INSTANCE_KEY] = this;
      if (this.slides.length === 0) return;

      this.prevBtn = root.querySelector(SELECTORS.prev);
      this.nextBtn = root.querySelector(SELECTORS.next);
      this.toggleBtn = root.querySelector(SELECTORS.toggle);
      this.statusEl = root.querySelector(SELECTORS.status);

      this.autoplayEnabled = root.getAttribute(ATTRIBUTES.autoplay) === 'true';
      this.speed = parseInt(root.getAttribute(ATTRIBUTES.speed), 10) || DEFAULT_SPEED;
      this.prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

      this.current = 0;
      this.timer = null;
      this.isPlaying = false;

      this._attachEvents();

      this.goTo(0, { silent: true });
      if (this.canAutoplay) this.play();
    }

    /** Single source of truth for whether autoplay should be running. */
    get canAutoplay() {
      return this.autoplayEnabled && this.slides.length > 1 && !this.prefersReducedMotion;
    }

    announce(text) {
      if (this.statusEl) this.statusEl.textContent = text;
    }

    goTo(index, { silent = false } = {}) {
      const previousIndex = this.current;
      this.current = (index + this.slides.length) % this.slides.length;

      this._setSlideState(this.slides[previousIndex], false);
      this._setSlideState(this.slides[this.current], true);

      if (!silent) {
        this.announce((this.slides[this.current].textContent || '').trim());
      }
    }

    _setSlideState(slide, isActive) {
      slide.classList.toggle(CLASSES.active, isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.setAttribute('tabindex', isActive ? '0' : '-1');
    }

    next = () => this.goTo(this.current + 1);

    prev = () => this.goTo(this.current - 1);

    play() {
      if (this.slides.length <= 1 || this.prefersReducedMotion) return;

      this.stop();
      this.timer = window.setInterval(this.next, this.speed);
      this.isPlaying = true;
      this._updatePlayState(true);
    }

    stop() {
      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      this.isPlaying = false;
      this._updatePlayState(false);
    }

    _updatePlayState(isPlaying) {
      if (this.statusEl) {
        this.statusEl.setAttribute('aria-live', isPlaying ? ARIA_LIVE.playing : ARIA_LIVE.paused);
      }
      if (this.toggleBtn) {
        this.toggleBtn.setAttribute('data-playing', String(isPlaying));
        this.toggleBtn.setAttribute('aria-pressed', String(isPlaying));
        this.toggleBtn.setAttribute('aria-label', isPlaying ? TOGGLE_LABEL.playing : TOGGLE_LABEL.paused);
      }
    }

    handleNextClick = () => {
      this.stop();
      this.next();
    };

    handlePrevClick = () => {
      this.stop();
      this.prev();
    };

    handleToggleClick = () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.play();
      }
    };

    handleKeydown = (event) => {
      if (event.key === KEYS.NEXT) this.handleNextClick();
      if (event.key === KEYS.PREV) this.handlePrevClick();
    };

    handleMouseEnter = () => {
      if (this.autoplayEnabled) this.stop();
    };

    handleMouseLeave = () => {
      if (this.canAutoplay) this.play();
    };

    handleFocusIn = () => {
      if (this.autoplayEnabled) this.stop();
    };

    handleFocusOut = (event) => {
      if (this.canAutoplay && !this.root.contains(event.relatedTarget)) this.play();
    };

    handleVisibilityChange = () => {
      if (document.hidden) {
        this.stop();
      } else if (this.canAutoplay) {
        this.play();
      }
    };

    _attachEvents() {
      if (this.nextBtn) this.nextBtn.addEventListener('click', this.handleNextClick);
      if (this.prevBtn) this.prevBtn.addEventListener('click', this.handlePrevClick);
      if (this.toggleBtn) this.toggleBtn.addEventListener('click', this.handleToggleClick);

      this.root.addEventListener('keydown', this.handleKeydown);
      this.root.addEventListener('mouseenter', this.handleMouseEnter);
      this.root.addEventListener('mouseleave', this.handleMouseLeave);
      this.root.addEventListener('focusin', this.handleFocusIn);
      this.root.addEventListener('focusout', this.handleFocusOut);

      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    destroy() {
      this.stop();

      if (this.nextBtn) this.nextBtn.removeEventListener('click', this.handleNextClick);
      if (this.prevBtn) this.prevBtn.removeEventListener('click', this.handlePrevClick);
      if (this.toggleBtn) this.toggleBtn.removeEventListener('click', this.handleToggleClick);

      this.root.removeEventListener('keydown', this.handleKeydown);
      this.root.removeEventListener('mouseenter', this.handleMouseEnter);
      this.root.removeEventListener('mouseleave', this.handleMouseLeave);
      this.root.removeEventListener('focusin', this.handleFocusIn);
      this.root.removeEventListener('focusout', this.handleFocusOut);

      document.removeEventListener('visibilitychange', this.handleVisibilityChange);

      delete this.root[AnnouncementCarousel.INSTANCE_KEY];
    }

    static getInstance(root) {
      return root ? root[AnnouncementCarousel.INSTANCE_KEY] : null;
    }

    static initAll(context = document) {
      const carousels = context.querySelectorAll(AnnouncementCarousel.ROOT_SELECTOR);
      carousels.forEach((root) => {
        if (!AnnouncementCarousel.getInstance(root)) {
          new AnnouncementCarousel(root);
        }
      });
    }
  }

  function ready() {
    AnnouncementCarousel.initAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }

  // Shopify theme editor integration
  document.addEventListener('shopify:section:load', (event) => {
    AnnouncementCarousel.initAll(event.target);
  });

  document.addEventListener('shopify:block:select', (event) => {
    const blockEl = event.target;
    const section = blockEl.closest(SELECTORS.section);
    if (!section) return;

    const carouselRoot = section.querySelector(SELECTORS.root);
    const instance = AnnouncementCarousel.getInstance(carouselRoot);
    if (!instance) return;

    const slideEl = section.querySelector(`#${blockEl.id}`) || blockEl;
    const index = instance.slides.indexOf(slideEl);

    instance.stop();
    if (index > -1) instance.goTo(index);
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    const section = event.target.closest(SELECTORS.section);
    if (!section) return;

    const carouselRoot = section.querySelector(SELECTORS.root);
    const instance = AnnouncementCarousel.getInstance(carouselRoot);
    if (instance && instance.autoplayEnabled) instance.play();
  });
})();