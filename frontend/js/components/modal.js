// ─── Career OS: Modal Component ───

/**
 * Show a modal dialog.
 * @param {Object} opts
 * @param {string} opts.title - Modal title
 * @param {string} opts.bodyHTML - HTML content for the body
 * @param {string} [opts.confirmText='Save'] - Confirm button text
 * @param {string} [opts.cancelText='Cancel'] - Cancel button text
 * @param {boolean} [opts.danger=false] - Use danger styling for confirm
 * @param {Function} opts.onConfirm - Called on confirm click (receives close fn)
 * @returns {Function} close function
 */
export function showModal(opts) {
  const {
    title,
    bodyHTML,
    confirmText = 'Save',
    cancelText = 'Cancel',
    danger = false,
    onConfirm,
  } = opts;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const btnClass = danger ? 'btn btn-danger' : 'btn btn-primary';

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn-ghost btn-icon" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body" id="modal-body">
        ${bodyHTML}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
        <button class="${btnClass}" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', close);
  overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
    if (onConfirm) onConfirm(close);
  });

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close on Escape
  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKeydown);
    }
  }
  document.addEventListener('keydown', onKeydown);

  return close;
}
