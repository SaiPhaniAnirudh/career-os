// ─── Career OS: Simple Reactive State Store ───

/**
 * Minimal pub-sub state store. Components subscribe to keys and re-render
 * when those keys change — no framework needed.
 */
class Store {
  constructor() {
    this._state = {};
    this._listeners = new Map(); // key -> Set<callback>
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    this._state[key] = value;
    this._notify(key);
  }

  /** Update a key by merging with existing value (shallow). */
  update(key, partial) {
    const current = this._state[key] || {};
    this._state[key] = { ...current, ...partial };
    this._notify(key);
  }

  /** Subscribe to changes on a key. Returns unsubscribe fn. */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
    return () => this._listeners.get(key)?.delete(callback);
  }

  _notify(key) {
    const listeners = this._listeners.get(key);
    if (listeners) {
      listeners.forEach(cb => cb(this._state[key]));
    }
  }
}

export const store = new Store();

// Initialize default state
store.set('user', null);
store.set('applications', []);
store.set('loading', {});
