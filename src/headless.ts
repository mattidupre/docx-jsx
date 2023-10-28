import { type DocumentOptions } from 'src/entities';
import { createPager } from 'src/lib/pager';

const rootEl = document.createElement('div');
document.body.appendChild(rootEl);
const globalObj = {
  renderPages: (document: DocumentOptions) => createPager(rootEl, document),
};

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
