import { htmlToDom } from './lib/htmlToDom.js';

const globalObj = { htmlToDom };

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
