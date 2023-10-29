import { type DocumentOptions } from 'src/entities';
import { htmlObjToHtml } from 'src/htmlObjToHtml';

const rootEl = document.createElement('div');
document.body.appendChild(rootEl);
const globalObj = {
  renderPages: (document: DocumentOptions) => htmlObjToHtml(rootEl, document),
};

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
