(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. Filter Drawer                                                   */
  /* ------------------------------------------------------------------ */
  if (!customElements.get('filter-drawer')) {
    class FilterDrawer extends HTMLElement {
      connectedCallback() {
        this.toggleButton = this.querySelector('.product-grid-toolbar__filters-toggle');
        this.dialog = this.querySelector('dialog');
        this.closeButton = this.querySelector('.product-grid-filters__close');
        this.form = this.dialog?.querySelector('form');

        // Bind once so add/removeEventListener reference the same function.
        this.handleOpen = this.open.bind(this);
        this.handleClose = this.close.bind(this);
        this.handleBackdropClick = (event) => {
          if (event.target === this.dialog) this.close();
        };
        this.handleDialogClosed = () => {
          this.toggleButton?.setAttribute('aria-expanded', 'false');
          this.toggleButton?.focus();
        };

        this.toggleButton?.addEventListener('click', this.handleOpen);
        this.closeButton?.addEventListener('click', this.handleClose);
        this.dialog?.addEventListener('cancel', this.handleClose);
        this.dialog?.addEventListener('click', this.handleBackdropClick);
        this.dialog?.addEventListener('close', this.handleDialogClosed);
        this.form?.addEventListener('submit', this.handleClose);
      }

      disconnectedCallback() {
        // Prevents listeners from accumulating if the section re-renders
        // (e.g. theme editor live updates) without a full page reload.
        this.toggleButton?.removeEventListener('click', this.handleOpen);
        this.closeButton?.removeEventListener('click', this.handleClose);
        this.dialog?.removeEventListener('cancel', this.handleClose);
        this.dialog?.removeEventListener('click', this.handleBackdropClick);
        this.dialog?.removeEventListener('close', this.handleDialogClosed);
        this.form?.removeEventListener('submit', this.handleClose);
      }

      open() {
        if (this.dialog && !this.dialog.open) {
          this.dialog.showModal();
          this.toggleButton?.setAttribute('aria-expanded', 'true');
        }
      }

      close() {
        if (this.dialog?.open) this.dialog.close();
      }
    }

    customElements.define('filter-drawer', FilterDrawer);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Sort auto-submit                                                */
  /* ------------------------------------------------------------------ */
  // Delegated on document, so it works for any number of grid sections
  // on the page without per-instance listener setup/teardown.
  document.addEventListener('change', (event) => {
    const select = event.target.closest('.product-grid-toolbar__sort-select');
    if (!select) return;

    const form = select.form || document.getElementById(select.getAttribute('form'));
    if (!form) return;

    select.disabled = true;
    form.requestSubmit ? form.requestSubmit() : form.submit();
  });

  /* ------------------------------------------------------------------ */
  /* 3. Quick add-to-cart                                               */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', handleAddToCartClick);

  async function handleAddToCartClick(event) {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button || button.disabled) return;

    const variantId = button.getAttribute('data-variant-id');
    if (!variantId) return;

    const originalText = button.textContent;
    const addingText = button.getAttribute('data-adding-text') || 'Adding…';
    const addedText = button.getAttribute('data-added-text') || 'Added';
    const errorText = button.getAttribute('data-error-text') || 'Try again';

    button.disabled = true;
    button.textContent = addingText;

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
      });

      if (!response.ok) throw new Error('Add to cart failed');

      button.textContent = addedText;
      document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
      await updateCartBubble();

      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
    } catch (error) {
      button.textContent = errorText;
      button.disabled = false;
    }
  }

  async function updateCartBubble() {
    const bubble = document.getElementById('cart-icon-bubble');
    if (!bubble) return;

    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      bubble.textContent = cart.item_count;
    } catch (error) {
      // Non-critical — the bubble just won't refresh this cycle.
    }
  }
})();