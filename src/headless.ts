import { htmlToDom } from './lib/htmlToDom';

// Bundled into one file to be passed to Puppeteer. Should not do anything
// React-related.

const globalObj = { htmlToDom };
export type Headless = typeof globalObj;
(window as any).headless = globalObj;
