// ─── Career OS: Hash-Based SPA Router ───

const routes = new Map();
let currentCleanup = null;

/**
 * Register a route. `handler` receives the container element and should
 * return a cleanup function (or void).
 */
export function route(path, handler) {
  routes.set(path, handler);
}

/** Navigate to a hash route. */
export function navigate(path) {
  window.location.hash = path;
}

/** Get the current route path. */
export function currentRoute() {
  return window.location.hash.slice(1) || '/';
}

/** Start the router — listens for hash changes and renders into `container`. */
export function startRouter(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Router: container #${containerId} not found`);
    return;
  }

  async function handleRoute() {
    const rawHash = window.location.hash;
    if (rawHash.includes('access_token=') || rawHash.includes('refresh_token=')) {
      // Allow auth system to parse tokens from hash without clobbering
      return;
    }

    const path = currentRoute();
    const basePath = path.split('?')[0] || '/';

    // Run cleanup from previous page
    if (typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    const handler = routes.get(basePath);
    if (handler) {
      container.innerHTML = '';
      container.classList.remove('fade-in');
      // Force reflow to restart animation
      void container.offsetWidth;
      container.classList.add('fade-in');
      currentCleanup = await handler(container);
    } else {
      // Default redirect
      navigate('/dashboard');
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
