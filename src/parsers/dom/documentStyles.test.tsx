import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { reactToDocx } from '../../reactToDocx';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import {
  attribute,
  findAll,
  inspectDocx,
  textOf,
} from '../../fixtures/docxInspect';
import type { PrefixesOptions } from '../../entities';
import type * as htmlToDomModule from './htmlToDom';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type DomApi = typeof htmlToDomModule;

type ProbeStyle = { fontSize: string; color: string; marginTop: string };

const createPrefixedDocument = (
  prefixes: PrefixesOptions,
  fontSize: `${number}px`,
) =>
  function PrefixedDocument() {
    return (
      <DocumentProvider
        prefixes={prefixes}
        variants={{ body: { fontSize, color: 'rgb(0, 128, 0)' } }}
      >
        <Stack>
          <Typography as="h2" className="probe-heading">
            Heading
          </Typography>
          <Typography as="p" variant="body" className="probe-body">
            Body
          </Typography>
        </Stack>
      </DocumentProvider>
    );
  };

function BrandDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Typography
          as="p"
          color={['--brand', '#00dddd']}
          className="probe-brand"
        >
          Brand
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

/**
 * Renders every document in `htmls` into the same page, one after another,
 * leaving all of them attached, and reads the probes of each.
 */
const renderTogether = (
  harness: BrowserHarness<DomApi>,
  htmls: ReadonlyArray<string>,
  hostCss: string,
) =>
  harness.evaluate(
    async (
      api,
      pageHtmls: ReadonlyArray<string>,
      css: string,
    ): Promise<Array<Record<string, ProbeStyle>>> => {
      document.body.replaceChildren();
      document.head.querySelector('style[data-host]')?.remove();
      const style = document.createElement('style');
      style.dataset.host = '';
      style.textContent = css;
      document.head.append(style);

      const containers: Array<HTMLElement> = [];
      for (const pageHtml of pageHtmls) {
        const pagesEl = await api.htmlToDom(pageHtml, { fonts: {} });
        document.body.append(pagesEl);
        containers.push(pagesEl);
      }
      return containers.map((container) =>
        Object.fromEntries(
          Array.from(container.querySelectorAll('[class*="probe-"]')).map(
            (element) => {
              const computed = window.getComputedStyle(element);
              const probe =
                Array.from(element.classList).find((className) =>
                  className.startsWith('probe-'),
                ) ?? '';
              return [
                probe,
                {
                  fontSize: computed.fontSize,
                  color: computed.color,
                  marginTop: computed.marginTop,
                },
              ];
            },
          ),
        ),
      );
    },
    [...htmls],
    hostCss,
  );

describe('document stylesheets', () => {
  let browser: Browser;
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

  /**
   * The content stylesheet is compiled once with its CSS variable prefix left
   * open and instantiated per document, so two documents with different
   * prefixes on one page each read their own variables.
   */
  it('styles documents with different prefixes on one page', async () => {
    const [plain, resume] = await renderTogether(
      harness,
      [
        reactToHtml(createPrefixedDocument({}, '20px'), 'pdf'),
        reactToHtml(
          createPrefixedDocument({ cssVariable: 'resume' }, '30px'),
          'pdf',
        ),
      ],
      '',
    );

    for (const [probes, fontSize] of [
      [plain, '20px'],
      [resume, '30px'],
    ] as const) {
      expect(probes['probe-body']).toMatchObject({
        fontSize,
        color: 'rgb(0, 128, 0)',
      });
      // The intrinsic heading scale reads the document's own prefix too.
      expect(probes['probe-heading']).toMatchObject({
        fontSize: '24px',
        marginTop: '19.92px',
      });
    }
  });

  /**
   * Two previews of one document on one page, one with a consumer override:
   * rendering the second must not undo the first one's override, which its
   * pagination was measured with.
   */
  it('keeps the stylesheets of each render to its own pages', async () => {
    const html = reactToHtml(createPrefixedDocument({}, '20px'), 'pdf');
    const probes = await harness.evaluate(async (api, pageHtml: string) => {
      document.body.replaceChildren();
      const overridden = await api.htmlToDom(pageHtml, {
        fonts: {},
        styleSheets: [':where(p) { font-size: 10px; }'],
      });
      document.body.append(overridden);
      const plain = await api.htmlToDom(pageHtml, { fonts: {} });
      document.body.append(plain);
      const fontSizeOf = (container: HTMLElement) => {
        const probe = container.querySelector('.probe-body');
        if (!probe) {
          throw new Error('The body probe was not rendered.');
        }
        return window.getComputedStyle(probe).fontSize;
      };
      return { overridden: fontSizeOf(overridden), plain: fontSizeOf(plain) };
    }, html);
    expect(probes).toEqual({ overridden: '10px', plain: '20px' });
  });

  /**
   * Neutralising a host page is about what it leaks by accident. A fallback
   * array is a document asking for a host variable on purpose, so a host that
   * defines it changes the browser targets -- and only those: Word has no
   * cascade, so DOCX takes the last literal of the array.
   */
  it('lets a host variable a document asked for reach it', async () => {
    const html = reactToHtml(BrandDocument, 'pdf');
    const [[blank], [branded]] = [
      await renderTogether(harness, [html], ''),
      await renderTogether(
        harness,
        [html],
        ':root { --brand: rgb(255, 0, 0); }',
      ),
    ];

    expect(blank['probe-brand'].color).toBe('rgb(0, 221, 221)');
    expect(branded['probe-brand'].color).toBe('rgb(255, 0, 0)');

    const { document } = await inspectDocx(
      await reactToDocx(BrandDocument, {}),
    );
    const [run] = findAll(document, 'w:r').filter((node) =>
      textOf(node).includes('Brand'),
    );
    const [color] = findAll(run, 'w:color');
    expect(attribute(color, 'w:val')?.toLowerCase()).toBe('00dddd');
  });
});
