import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import type * as reactModule from 'react';
import type * as reactDomClientModule from 'react-dom/client';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../fixtures/browserHarness';
import type * as useInjectStyleSheetsModule from './useInjectStyleSheets';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type HookApi = typeof reactModule &
  typeof reactDomClientModule &
  typeof useInjectStyleSheetsModule;

const OTHER_CSS = '#other { color: rgb(9, 9, 9); }';

const INJECTED_CSS = '#injected { color: rgb(1, 2, 3); }';

describe('useInjectStyleSheets', () => {
  let browser: Browser;
  let harness: BrowserHarness<HookApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<HookApi>(browser, {
      modules: ['react', 'react-dom/client', './useInjectStyleSheets'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  /**
   * Mounts a component that injects `injectedCss` alongside a stylesheet the
   * hook does not own, and reports the adopted stylesheets at each step. When
   * `removeExternally` is set, the hook's own sheet is dropped from the
   * document while the component is still mounted.
   */
  const runHook = (
    injectedCss: string,
    otherCss: string,
    removeExternally: boolean,
  ) =>
    harness.evaluate(
      async (api, css: string, otherStyleSheetCss: string, remove: boolean) => {
        const settle = () =>
          new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        const toText = (styleSheet: CSSStyleSheet) =>
          Array.from(styleSheet.cssRules, (rule) => rule.cssText).join('');

        const otherStyleSheet = new CSSStyleSheet();
        await otherStyleSheet.replace(otherStyleSheetCss);
        document.adoptedStyleSheets = [otherStyleSheet];

        const containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        const root = api.createRoot(containerEl);

        const StyleSheetConsumer = () => {
          api.useInjectStyleSheets([css]);
          return null;
        };

        root.render(api.createElement(StyleSheetConsumer));
        await settle();
        const afterMount = document.adoptedStyleSheets.map(toText);

        if (remove) {
          document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
            (styleSheet) => styleSheet === otherStyleSheet,
          );
        }
        const afterRemoval = document.adoptedStyleSheets.map(toText);

        root.unmount();
        await settle();
        const afterUnmount = document.adoptedStyleSheets.map(toText);

        containerEl.remove();

        return { afterMount, afterRemoval, afterUnmount };
      },
      injectedCss,
      otherCss,
      removeExternally,
    );

  it('adopts its stylesheet on mount and removes it on unmount', async () => {
    const { afterMount, afterUnmount } = await runHook(
      INJECTED_CSS,
      OTHER_CSS,
      false,
    );

    expect(afterMount).toEqual([OTHER_CSS, INJECTED_CSS]);
    // Only the hook's own sheet is removed.
    expect(afterUnmount).toEqual([OTHER_CSS]);
  });

  it('leaves other stylesheets alone when its own was already removed', async () => {
    const { afterRemoval, afterUnmount } = await runHook(
      INJECTED_CSS,
      OTHER_CSS,
      true,
    );

    expect(afterRemoval).toEqual([OTHER_CSS]);
    // Without the `-1` guard the cleanup would splice out the last adopted
    // stylesheet, which belongs to somebody else.
    expect(afterUnmount).toEqual([OTHER_CSS]);
  });
});
