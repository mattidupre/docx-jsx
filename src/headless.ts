import { treeToDom } from 'src/lib/treeToDom.js';

const globalObj = { treeToDom };

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
