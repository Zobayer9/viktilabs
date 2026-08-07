if (!customElements.get('testimonials-carousel')) {
  class TestimonialsCarousel extends HTMLElement {
    constructor() {
      super();

      // DOM refs
      this.track = null;
      this.prevButton = null;
      this.nextButton = null;
      this.pauseButton = null;

      // State
      this.autoplayTimer = null;
      this.prefersReducedMotion = false;
      this.motionQuery = null;
      this.isPlaying = false;
      this._isConnected = false;
      this._scrollAmount = 0;
      this._scrollRaf = null;

      // Bound methods
      this.onPrevClick = this.onPrevClick.bind(this);
      this.onNextClick = this.onNextClick.bind(this);
      this.onPauseClick = this.onPauseClick.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onMotionChange = this.onMotionChange.bind(this);
      this.pauseAutoplay = this.pauseAutoplay.bind(this);
      this.resumeAutoplayIfNeeded = this.resumeAutoplayIfNeeded.bind(this);
    }

    connectedCallback() {
      this.track = this.querySelector('.testimonials__track');
      this.prevButton = this.querySelector('.testimonials__nav--prev');
      this.nextButton = this.querySelector('.testimonials__nav--next');
      this.pauseButton = this.querySelector('.testimonials__pause');

      // Guard against missing track or double attachment
      if (!this.track || this._isConnected) return;
      this._isConnected = true;

      // Live reduced-motion preference
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener('change', this.onMotionChange);

      // Autoplay only if requested AND motion is allowed
      this.isPlaying = this.dataset.autoplay === 'true' && !this.prefersReducedMotion;
      this._scrollAmount = this.getScrollAmount();

      // Event listeners
      this.prevButton?.addEventListener('click', this.onPrevClick);
      this.nextButton?.addEventListener('click', this.onNextClick);
      this.pauseButton?.addEventListener('click', this.onPauseClick);
      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);
      this.addEventListener('keydown', this.onKeyDown);
      this.addEventListener('pointerenter', this.pauseAutoplay);
      this.addEventListener('pointerleave', this.resumeAutoplayIfNeeded);
      this.addEventListener('focusin', this.pauseAutoplay);
      this.addEventListener('focusout', this.resumeAutoplayIfNeeded);

      this.updateNavState();
      this.setPauseButtonState();
      if (this.isPlaying) this.startAutoplay();
    }

    disconnectedCallback() {
      if (!this._isConnected) return;
      this._isConnected = false;

      this.stopAutoplay();

      // Remove all listeners to prevent memory leaks
      this.prevButton?.removeEventListener('click', this.onPrevClick);
      this.nextButton?.removeEventListener('click', this.onNextClick);
      this.pauseButton?.removeEventListener('click', this.onPauseClick);
      this.track?.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      this.removeEventListener('keydown', this.onKeyDown);
      this.removeEventListener('pointerenter', this.pauseAutoplay);
      this.removeEventListener('pointerleave', this.resumeAutoplayIfNeeded);
      this.removeEventListener('focusin', this.pauseAutoplay);
      this.removeEventListener('focusout', this.resumeAutoplayIfNeeded);

      this.motionQuery?.removeEventListener('change', this.onMotionChange);

      if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
    }

    getScrollAmount() {
      const card = this.track?.querySelector('.testimonials__card');
      if (!card) return this.track?.clientWidth || 0;
      const styles = getComputedStyle(this.track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0');
      return card.getBoundingClientRect().width + gap;
    }

    onPrevClick() {
      this.track.scrollBy({
        left: -this._scrollAmount,
        behavior: this.prefersReducedMotion ? 'auto' : 'smooth'
      });
      this.pauseAutoplay();
    }

    onNextClick() {
      this.track.scrollBy({
        left: this._scrollAmount,
        behavior: this.prefersReducedMotion ? 'auto' : 'smooth'
      });
      this.pauseAutoplay();
    }

    onPauseClick() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.startAutoplay();
      } else {
        this.stopAutoplay();
      }
      this.setPauseButtonState();
    }

    setPauseButtonState() {
      if (!this.pauseButton) return;

      const pauseIcon = this.pauseButton.querySelector('[data-icon-pause]');
      const playIcon = this.pauseButton.querySelector('[data-icon-play]');
      const label = this.pauseButton.querySelector('[data-pause-label]');

      const pauseText = label?.dataset.pauseText || 'Pause';
      const playText = label?.dataset.playText || 'Play';

      // Clearer semantics: label tells you what the button will do
      this.pauseButton.setAttribute('aria-label', this.isPlaying ? pauseText : playText);
      if (pauseIcon) pauseIcon.hidden = !this.isPlaying;
      if (playIcon) playIcon.hidden = this.isPlaying;
      if (label) label.textContent = this.isPlaying ? pauseText : playText;
    }

    startAutoplay() {
      this.stopAutoplay();
      if (this.prefersReducedMotion) return;

      const speed = Math.max(1000, parseInt(this.dataset.autoplaySpeed, 10) || 5000);

      const tick = () => {
        if (!this.track) return;

        const maxScroll = this.track.scrollWidth - this.track.clientWidth;
        const atEnd = this.track.scrollLeft >= maxScroll - 2;

        if (atEnd) {
          this.track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          this.track.scrollBy({ left: this._scrollAmount, behavior: 'smooth' });
        }

        this.autoplayTimer = window.setTimeout(tick, speed);
      };

      this.autoplayTimer = window.setTimeout(tick, speed);
    }

    stopAutoplay() {
      if (this.autoplayTimer) {
        window.clearTimeout(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    pauseAutoplay() {
      this.stopAutoplay();
    }

    resumeAutoplayIfNeeded() {
      if (this.isPlaying && !this.prefersReducedMotion) {
        this.startAutoplay();
      }
    }

    onMotionChange(event) {
      this.prefersReducedMotion = event.matches;
      if (this.prefersReducedMotion) {
        this.stopAutoplay();
      } else if (this.isPlaying) {
        this.startAutoplay();
      }
    }

    // RAF-throttled scroll handler
    onScroll() {
      if (this._scrollRaf) return;
      this._scrollRaf = requestAnimationFrame(() => {
        this.updateNavState();
        this._scrollRaf = null;
      });
    }

    onResize() {
      this._scrollAmount = this.getScrollAmount();
      this.updateNavState();
    }

    onKeyDown(event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.onPrevClick();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.onNextClick();
      }
    }

    updateNavState() {
      if (!this.track) return;

      const maxScroll = this.track.scrollWidth - this.track.clientWidth;
      const atStart = this.track.scrollLeft <= 2;
      const atEnd = this.track.scrollLeft >= maxScroll - 2;
      const hasOverflow = maxScroll > 2;

      if (this.prevButton) this.prevButton.disabled = atStart;
      if (this.nextButton) this.nextButton.disabled = !hasOverflow || atEnd;
    }
  }

  customElements.define('testimonials-carousel', TestimonialsCarousel);
}