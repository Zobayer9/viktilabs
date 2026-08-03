
if (!customElements.get('collection-list-carousel')) {
  class CollectionListCarousel extends HTMLElement {
    constructor() {
      super();
      this.onResize = this.updateNav.bind(this);
      this.onScroll = this.updateNav.bind(this);
      this.onClick = this.handleClick.bind(this);
    }

    connectedCallback() {
      this.viewport = this.querySelector('.collection-list-carousel__viewport');
      this.nav = this.querySelector('.collection-list-carousel__nav');
      this.buttons = this.querySelectorAll('.collection-list-carousel__button');

      if (!this.viewport || !this.nav || this.buttons.length === 0) return;

      this.viewport.addEventListener('scroll', this.onScroll, { passive: true });
      this.addEventListener('click', this.onClick);
      window.addEventListener('resize', this.debounce(this.onResize, 150));

      this.updateNav();
    }

    disconnectedCallback() {
      this.viewport?.removeEventListener('scroll', this.onScroll);
      this.removeEventListener('click', this.onClick);
      window.removeEventListener('resize', this.onResize);
    }

    handleClick(event) {
      const button = event.target.closest('.collection-list-carousel__button');
      if (!button) return;

      const direction = button.dataset.direction === 'prev' ? -1 : 1;
      const amount = this.viewport.clientWidth * 0.9 * direction;
      this.viewport.scrollBy({ left: amount });
    }

    updateNav() {
      const overflows = this.viewport.scrollWidth > this.viewport.clientWidth + 1;
      this.nav.hidden = !overflows;
      if (!overflows) return;

      const atStart = this.viewport.scrollLeft <= 1;
      const atEnd =
        this.viewport.scrollLeft + this.viewport.clientWidth >= this.viewport.scrollWidth - 1;

      this.querySelector('[data-direction="prev"]').disabled = atStart;
      this.querySelector('[data-direction="next"]').disabled = atEnd;
    }

    debounce(fn, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    }
  }

  customElements.define('collection-list-carousel', CollectionListCarousel);
}
