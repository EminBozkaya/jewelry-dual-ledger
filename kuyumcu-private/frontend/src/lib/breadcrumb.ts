type BreadcrumbLabelRegistry = Record<string, string>;

let registry: BreadcrumbLabelRegistry = {};
const listeners: Set<() => void> = new Set();

export const breadcrumbLabelRegistry = {
  set: (id: string, label: string) => {
    if (registry[id] === label) return;
    registry[id] = label;
    listeners.forEach(l => l());
  },
  get: (id: string) => registry[id],
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
