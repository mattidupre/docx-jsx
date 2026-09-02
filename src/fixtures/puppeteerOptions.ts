import type { LaunchOptions } from 'puppeteer-core';

const DEFAULT_CHROME_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const PUPPETEER_OPTIONS: LaunchOptions = {
  executablePath: process.env.MATTI_DOCS_CHROME_PATH || DEFAULT_CHROME_PATH,
};
