import { documentRootToDom } from 'src/lib/treeToDom/index.js';

const globalObj = { documentRootToDom };

export type Headless = typeof globalObj;

(window as any).headless = globalObj;
