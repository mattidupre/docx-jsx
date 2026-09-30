import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import type * as previewElementModule from '../../previewElement';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type PreviewElementApi = typeof previewElementModule;

const createDocument = (text: string) =>
  function PreviewedDocument() {
    return (
      <DocumentProvider>
        <Stack>
          <Typography as="h1" className="probe">
            {text}
          </Typography>
        </Stack>
      </DocumentProvider>
    );
  };

function FontDocument() {
  return (
    <DocumentProvider
      fonts={{
        Unfetchable: {
          fontFaces: [
            {
              fontWeight: '400',
              fontStyle: 'normal',
              sources: [{ src: 'unfetchable.ttf', format: 'truetype' }],
            },
          ],
        },
      }}
    >
      <Stack>
        <p>Text</p>
      </Stack>
    </DocumentProvider>
  );
}

describe('<matti-docs-preview>', () => {
  let browser: Browser;
  let harness: BrowserHarness<PreviewElementApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<PreviewElementApi>(browser, {
      modules: ['../../previewElement'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  it('renders, re-renders, and cleans up after itself', async () => {
    const result = await harness.evaluate(
      async (api, firstHtml: string, secondHtml: string) => {
        api.definePreviewElement();
        const sheetsBefore = document.adoptedStyleSheets.length;
        const preview = document.createElement(api.PREVIEW_ELEMENT_TAG_NAME);
        preview.setAttribute('autoscale', '');
        // Autoscale makes the preview as wide as its container.
        const container = document.createElement('div');
        container.style.width = '400px';
        document.body.append(container);
        container.append(preview);

        const read = () => {
          const heading = preview.querySelector('.probe');
          return {
            text: heading?.textContent,
            fontSize: heading && window.getComputedStyle(heading).fontSize,
            pageCount: preview.querySelectorAll('matti-docs-page').length,
            transform:
              preview.firstElementChild instanceof HTMLElement
                ? preview.firstElementChild.style.transform
                : '',
            sheets: document.adoptedStyleSheets.length - sheetsBefore,
          };
        };

        const rendering = preview.render(firstHtml);
        const busy = preview.getAttribute('aria-busy');
        const applied = await rendering;
        const first = read();

        await preview.render(secondHtml);
        const second = read();

        // A render superseded by a later one changes nothing.
        const superseded = preview.render(firstHtml);
        const latest = preview.render(secondHtml);
        const outcomes = await Promise.all([superseded, latest]);

        preview.remove();
        const removed = {
          children: preview.childElementCount,
          sheets: document.adoptedStyleSheets.length - sheetsBefore,
        };

        // Put back, it shows the last markup it was given.
        container.append(preview);
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
        const reattached = read();
        container.remove();

        return {
          busy,
          applied,
          first,
          second,
          outcomes,
          removed,
          reattached,
          busyAfter: preview.hasAttribute('aria-busy'),
        };
      },
      reactToHtml(createDocument('First'), 'pdf'),
      reactToHtml(createDocument('Second'), 'pdf'),
    );

    expect(result.busy).toBe('true');
    expect(result.applied).toBe(true);
    expect(result.first).toMatchObject({
      text: 'First',
      fontSize: '32px',
      pageCount: 1,
    });
    expect(result.first.transform).toMatch(/^scale\(0\.4/);
    expect(result.first.sheets).toBeGreaterThan(0);
    expect(result.second).toMatchObject({ text: 'Second', pageCount: 1 });
    expect(result.second.sheets).toBe(result.first.sheets);
    expect(result.outcomes).toEqual([false, true]);
    expect(result.removed).toEqual({ children: 0, sheets: 0 });
    expect(result.reattached).toMatchObject({ text: 'Second', pageCount: 1 });
    expect(result.busyAfter).toBe(false);
  });

  it('takes the stylesheets of an abandoned render out at once', async () => {
    const result = await harness.evaluate(
      async (api, pageHtml: string) => {
        api.definePreviewElement();
        const before = document.adoptedStyleSheets.length;
        const preview = document.createElement(api.PREVIEW_ELEMENT_TAG_NAME);
        document.body.append(preview);

        // The font's stylesheet is adopted before pagination starts.
        const rendering = preview.render(pageHtml);
        const during = document.adoptedStyleSheets.length - before;
        preview.remove();
        const afterRemove = document.adoptedStyleSheets.length - before;
        const applied = await rendering;
        return {
          during,
          afterRemove,
          applied,
          afterSettle: document.adoptedStyleSheets.length - before,
          children: preview.childElementCount,
        };
      },
      reactToHtml(FontDocument, 'pdf'),
    );

    expect(result.during).toBeGreaterThan(0);
    expect(result).toMatchObject({
      afterRemove: 0,
      applied: false,
      afterSettle: 0,
      children: 0,
    });
  });

  it('bundles without React', async () => {
    const { metafile } = await build({
      entryPoints: [path.join(RESOLVE_DIR, '../../previewElement.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
    });
    const inputs = Object.keys(metafile.inputs);
    expect(inputs.some((input) => input.includes('previewElement'))).toBe(true);
    expect(inputs.filter((input) => /\/react(-dom)?\//.test(input))).toEqual(
      [],
    );
  });
});
