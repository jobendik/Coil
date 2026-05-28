const mem: Record<string, unknown> = {};

export const Store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return (k in mem) ? (mem[k] as T) : d;
    }
  },
  set<T>(k: string, v: T): void {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      mem[k] = v;
    }
  },
};
