import { Store } from '../core/store';

/** Local top-5 personal score ladder. CrazyGames v3 has no generic JS
 *  leaderboard write API, so we keep a personal ladder for the comparison
 *  loop ("can I beat my #2?"). submit() is the place to wire a backend
 *  POST if/when one exists. */
export const Scores = {
  top: Store.get<number[]>('coil_top', []),

  add(h: number): void {
    if (h <= 0) return;
    this.top.push(h);
    this.top.sort((a, b) => b - a);
    this.top = this.top.slice(0, 5);
    Store.set('coil_top', this.top);
    this.submit(h);
  },

  submit(_h: number): void {
    /* backend/leaderboard hook: POST {height:_h} here if/when a server exists */
  },

  rank(h: number): number {
    let r = 1;
    for (const s of this.top) {
      if (s > h) r++;
    }
    return r;
  },
};
