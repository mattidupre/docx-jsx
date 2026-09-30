import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import type { FontsConfig } from '../../entities';
import { resolveDocumentFonts } from '../../lib/documentFonts';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import { VISUAL_DOCUMENTS } from '../../fixtures/visualDocuments';
import type * as htmlToDomModule from './htmlToDom';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

const MOCK_ASSETS_DIRECTORY = path.join(
  RESOLVE_DIR,
  '../../fixtures/mockAssets',
);

const KIT_SAMPLE_CSS = readFileSync(
  path.join(RESOLVE_DIR, '../../fixtures/kitSample.css'),
  'utf8',
);

type DomApi = typeof htmlToDomModule;

type HostEnvironment = {
  /** CSS the host page itself carries, as a `<style>` in its `<head>`. */
  css: string;
  /** Classes on the host's `<html>`, e.g. a `dark` theme. */
  rootClassNames: ReadonlyArray<string>;
};

type ElementSnapshot = {
  path: string;
  rect: [number, number, number, number];
  style: Record<string, string>;
};

type RenderSnapshot = {
  pageCount: number;
  elements: ReadonlyArray<ElementSnapshot>;
};

/**
 * Renders `html` on a host page carrying `environment`, then records every
 * computed style and the geometry (relative to its page) of every element of
 * every page, page roots included.
 */
const snapshotRender = (
  harness: BrowserHarness<DomApi>,
  html: string,
  environment: HostEnvironment,
  fonts: FontsConfig,
) =>
  harness.evaluate(
    async (
      api,
      pageHtml: string,
      hostCss: string,
      rootClassNames: ReadonlyArray<string>,
      documentFonts: FontsConfig,
    ): Promise<RenderSnapshot> => {
      document.head.querySelector('style[data-host]')?.remove();
      document.body.replaceChildren();
      document.documentElement.className = rootClassNames.join(' ');
      if (hostCss) {
        const style = document.createElement('style');
        style.dataset.host = '';
        style.textContent = hostCss;
        document.head.append(style);
      }

      // The fixtures' font files are served by the PDF target and cannot be
      // fetched from this blank page. Both renders fall back to the same
      // system fonts, which is all a comparison needs. A fixture that sets
      // trimmed or cap height text still needs its font's metrics, which the
      // test reads in Node and passes in.
      const pagesEl = await api.htmlToDom(pageHtml, { fonts: documentFonts });
      document.body.append(pagesEl);

      const elements: Array<ElementSnapshot> = [];
      Array.from(pagesEl.children).forEach((pageRoot, pageIndex) => {
        const pageRect = pageRoot.getBoundingClientRect();
        const visit = (element: Element, elementPath: string) => {
          const rect = element.getBoundingClientRect();
          const computed = window.getComputedStyle(element);
          const style: Record<string, string> = {};
          for (const property of Array.from(computed)) {
            style[property] = computed.getPropertyValue(property);
          }
          elements.push({
            path: elementPath,
            rect: [
              rect.left - pageRect.left,
              rect.top - pageRect.top,
              rect.width,
              rect.height,
            ],
            style,
          });
          Array.from(element.children).forEach((child, index) => {
            visit(child, `${elementPath} > ${child.localName}:${index}`);
          });
        };
        visit(pageRoot, `page ${pageIndex + 1}`);
      });

      return { pageCount: pagesEl.children.length, elements };
    },
    html,
    environment.css,
    [...environment.rootClassNames],
    fonts,
  );

/**
 * Every difference between two renders, grouped by what differs so that a
 * leak reads as one line (`margin-top on 40 elements, e.g. ...`) rather than
 * one line per element.
 */
const diffRenders = (
  blank: RenderSnapshot,
  hosted: RenderSnapshot,
): ReadonlyArray<string> => {
  const byKind = new Map<string, { count: number; example: string }>();
  const record = (kind: string, example: string) => {
    const entry = byKind.get(kind) ?? { count: 0, example };
    entry.count += 1;
    byKind.set(kind, entry);
  };
  if (blank.pageCount !== hosted.pageCount) {
    record('page count', `${blank.pageCount} -> ${hosted.pageCount}`);
  }
  blank.elements.forEach((element, index) => {
    const other = hosted.elements[index];
    if (!other || other.path !== element.path) {
      record('structure', element.path);
      return;
    }
    if (element.rect.some((value, side) => value !== other.rect[side])) {
      record(
        'rect',
        `${element.path}: ${element.rect.join(',')} -> ${other.rect.join(',')}`,
      );
    }
    for (const property in element.style) {
      if (element.style[property] !== other.style[property]) {
        record(
          property,
          `${element.path}: ${element.style[property]} -> ${other.style[property]}`,
        );
      }
    }
  });
  return Array.from(
    byKind,
    ([kind, { count, example }]) => `${kind} on ${count}, e.g. ${example}`,
  );
};

const BLANK: HostEnvironment = { css: '', rootClassNames: [] };

/**
 * An unlayered reset in the style of the common "modern CSS resets" -- every
 * rule at zero specificity -- on a page that sets every inherited property it
 * can think of on `html` and `body`.
 */
const HOSTILE_CSS = `
  html, body {
    font: italic 900 22px/3 fantasy;
    color: rgb(255, 0, 0);
    letter-spacing: 2px;
    word-spacing: 6px;
    text-transform: uppercase;
    text-align: right;
    text-indent: 12px;
    white-space: pre-wrap;
    tab-size: 2;
    orphans: 5;
    widows: 5;
    hyphens: auto;
    background: rgb(17, 17, 17);
    color-scheme: dark;
    direction: rtl;
    unicode-bidi: isolate;
  }
  *, ::before, ::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border-color: rgb(255, 0, 0);
  }
  :where(ul, ol) { list-style: none; }
  :where(img, svg) { display: block; max-width: 100%; }
  :where(table) { border-collapse: collapse; }
`;

const HOSTS: ReadonlyArray<[string, HostEnvironment]> = [
  ['a page with a hostile reset', { css: HOSTILE_CSS, rootClassNames: [] }],
  ['a matti-kit page', { css: KIT_SAMPLE_CSS, rootClassNames: [] }],
  ['a dark matti-kit page', { css: KIT_SAMPLE_CSS, rootClassNames: ['dark'] }],
];

/**
 * A preview is rendered into an application page, and whatever that page's
 * own stylesheet resets or inherits must not reach the document: the pages
 * have to lay out and compute exactly as they do on a blank page, which is
 * the page the PDF is printed from.
 */
describe('a document rendered on a styled host page', () => {
  let browser: Browser;
  // One page for both renders: a tab that is not in front is throttled, and
  // pagination waits on font loading there.
  let harness: BrowserHarness<DomApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<DomApi>(browser, {
      modules: ['./htmlToDom'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  for (const [hostName, host] of HOSTS) {
    for (const { name, Document, fonts } of VISUAL_DOCUMENTS) {
      it(`renders the ${name} fixture on ${hostName} as on a blank page`, async () => {
        const html = reactToHtml(Document, 'pdf');
        const documentFonts =
          (fonts &&
            (await resolveDocumentFonts(html, {
              fonts,
              publicDirectory: MOCK_ASSETS_DIRECTORY,
            }))) ||
          {};
        const blank = await snapshotRender(harness, html, BLANK, documentFonts);
        const hosted = await snapshotRender(harness, html, host, documentFonts);
        expect(diffRenders(blank, hosted)).toEqual([]);
      });
    }
  }
});
