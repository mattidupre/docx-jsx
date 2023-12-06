import { htmlToDom } from 'src/lib/htmlToDom.js';

const globalObj = { htmlToDom };

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
