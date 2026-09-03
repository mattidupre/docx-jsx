import { launch, type Browser } from 'puppeteer-core';
import { PUPPETEER_OPTIONS } from './puppeteerOptions';

/**
 * Launch the Chrome instance used by tests and by the demo build. Every caller
 * is responsible for closing the returned browser with {@link closeTestBrowser}
 * (`afterAll` in a test file, a `finally` block in a script) so no Chrome
 * process outlives the run.
 */
export const launchTestBrowser = (): Promise<Browser> =>
  launch(PUPPETEER_OPTIONS);

/**
 * `browser.close()` resolves as soon as the devtools connection drops. When
 * several test files run in parallel the Chrome process can outlive that, so
 * the process is killed once the graceful close has been given its chance.
 */
export const closeTestBrowser = async (
  browser: undefined | Browser,
): Promise<void> => {
  if (!browser) {
    return;
  }
  const browserProcess = browser.process();
  try {
    await browser.close();
  } finally {
    if (browserProcess && browserProcess.exitCode === null) {
      browserProcess.kill('SIGKILL');
    }
  }
};
