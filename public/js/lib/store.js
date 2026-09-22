// Minimal pub-sub store. No framework — just enough to keep
// the profile preview and every page in sync with one source of truth.

class Store {
  constructor(initial = {}) {
    this.state = initial;
    this.listeners = new Set();
  }
  get() { return this.state; }
  set(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(fn => fn(this.state));
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const store = new Store({
  user: null,
  profile: null,
  links: [],
  appearance: null,
  settings: null,
  route: 'overview',
});
