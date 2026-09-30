import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  Bookmark,
  DocumentProvider,
  Link,
  List,
  ListItem,
  Stack,
  Svg,
  Typography,
} from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import type * as mapHtmlToDocumentModule from '../../lib/mapHtmlToDocument';
import type { FontsConfig } from '../../entities';
import type * as nodeToDomModule from './nodeToDom';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

type NodeToDomApi = typeof nodeToDomModule & typeof mapHtmlToDocumentModule;

/**
 * Renders the first stack of `html` through `nodeToDom` and returns its markup.
 */
const stackMarkup = (
  harness: BrowserHarness<NodeToDomApi>,
  html: string,
  stackIndex = 0,
) =>
  harness.evaluate(
    (api, documentHtml: string, index: number) => {
      const documentObj = api.mapHtmlToDocument<HTMLElement>(
        documentHtml,
        (node) => api.nodeToDom(node, { fonts: undefined }),
      );
      const wrapperEl = document.createElement('div');
      wrapperEl.appendChild(documentObj.stacks[index].content);
      return {
        html: wrapperEl.innerHTML,
        elements: Array.from(wrapperEl.querySelectorAll('*')).map(
          (element) => ({
            tagName: element.tagName,
            namespace: element.namespaceURI,
            className: element.getAttribute('class'),
            style: element.getAttribute('style'),
          }),
        ),
      };
    },
    html,
    stackIndex,
  );

function TypographyDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Typography as="p" color="#ff0000" fontSize="2rem" marginTop="1rem">
          Styled
        </Typography>
        <Typography as="h1" variant="heading1">
          Variant
        </Typography>
      </Stack>
      <Stack columns={{ columnCount: 2, columnGap: '0.25in' }}>
        <p>Column content</p>
      </Stack>
    </DocumentProvider>
  );
}

function SvgDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <Svg width="10" height="10" viewBox="0 0 10 10">
          <rect width="10" height="10" />
        </Svg>
      </Stack>
    </DocumentProvider>
  );
}

function NavigationDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>
          <Bookmark id="cetology">Cetology</Bookmark>
        </p>
        <List format="lowerRoman" start={3}>
          <ListItem>Third</ListItem>
        </List>
        <p>
          <Link to="#cetology">Back</Link>
          <Link href="https://example.com/">Out</Link>
        </p>
      </Stack>
    </DocumentProvider>
  );
}

/** Merriweather's metrics: at 12pt a 15.084pt single line, 8.916pt caps. */
const MERRIWEATHER: FontsConfig = {
  Merriweather: {
    fontFaces: [
      {
        sources: [{ src: '/Merriweather-Regular.ttf', format: 'truetype' }],
        metrics: {
          unitsPerEm: 1000,
          ascent: 984,
          descent: -273,
          lineGap: 0,
          capHeight: 743,
        },
      },
    ],
  },
};

function LineBoxDocument() {
  return (
    <DocumentProvider
      fonts={MERRIWEATHER}
      defaultTypography={{ fontFamily: 'Merriweather', fontSize: '12pt' }}
    >
      <Stack>
        <Typography as="p" lineHeight="1.5">
          Multiplier
        </Typography>
        <Typography as="p">Normal</Typography>
        <Typography as="p" lineHeight="18pt" textBoxTrim="both">
          Trimmed
        </Typography>
        <Typography as="p" capHeight="7.43pt" lineHeight="1.2">
          Caps
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

describe('nodeToDom', () => {
  let browser: Browser;
  let harness: BrowserHarness<NodeToDomApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<NodeToDomApi>(browser, {
      modules: ['./nodeToDom', '../../lib/mapHtmlToDocument'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  it('writes the line box a paragraph resolves to', async () => {
    const { elements } = await stackMarkup(
      harness,
      reactToHtml(LineBoxDocument, 'pdf'),
    );
    const [multiplier, normal, trimmed, caps] = elements
      .filter(({ tagName }) => tagName === 'P')
      .map(({ style }) => style ?? '');

    // An absolute line height, which the inlines inside inherit as it is.
    expect(multiplier).toContain('--matti-docs-line-height: 24px;');
    // `normal` is the font's own single line, as in Word.
    expect(normal).toContain('--matti-docs-line-height: 20.112px;');
    expect(trimmed).toContain(
      '--matti-docs-text-box: trim-both cap alphabetic;',
    );
    // capsize's trim for a browser without `text-box`.
    expect(trimmed).toContain("--matti-docs-trim: '';");
    expect(trimmed).toContain('--matti-docs-trim-cap-height: -0.3625em;');
    expect(trimmed).toContain('--matti-docs-trim-baseline: -0.3945em;');
    expect(normal).not.toContain('--matti-docs-trim');
    // 7.43pt capitals are 10pt Merriweather, on a 12pt line.
    expect(caps).toContain('--matti-docs-font-size: 13.3333px;');
    expect(caps).toContain('--matti-docs-line-height: 16px;');
  });

  it('writes typography options as prefixed css variables', async () => {
    const { html } = await stackMarkup(
      harness,
      reactToHtml(TypographyDocument, 'pdf'),
    );

    expect(html).toContain('--matti-docs-color: #ff0000;');
    // The markup keeps the lengths the author wrote; the variables the browser
    // reads have `rem` resolved against the 16px root DOCX uses.
    expect(html).toContain('--matti-docs-font-size: 32px;');
    expect(html).toContain('--matti-docs-margin-top: 16px;');
    expect(html).toContain('%22fontSize%22:%222rem%22');
  });

  it('writes the variant class name', async () => {
    const { elements } = await stackMarkup(
      harness,
      reactToHtml(TypographyDocument, 'pdf'),
    );

    expect(
      elements.find(({ tagName }) => tagName === 'H1')?.className,
    ).toContain('matti-docs-variant-heading-1');
  });

  it('wraps a multi-column stack in a columns element', async () => {
    const { html } = await stackMarkup(
      harness,
      reactToHtml(TypographyDocument, 'pdf'),
      1,
    );

    expect(html).toContain('column-count: 2;');
    expect(html).toContain('column-gap: 0.25in;');
    expect(html).toContain('<p');
  });

  it('creates svg subtrees in the svg namespace', async () => {
    const { elements } = await stackMarkup(
      harness,
      reactToHtml(SvgDocument, 'pdf'),
    );

    expect(
      elements.map(({ tagName, namespace }) => [tagName, namespace]),
    ).toEqual([
      ['svg', SVG_NAMESPACE],
      ['rect', SVG_NAMESPACE],
    ]);
  });

  it('keeps the marker, start and type of a list', async () => {
    const { html, elements } = await stackMarkup(
      harness,
      reactToHtml(NavigationDocument, 'pdf'),
    );

    expect(elements.map(({ tagName }) => tagName)).toContain('OL');
    expect(
      elements.find(({ tagName }) => tagName === 'OL')?.style,
    ).toContain('list-style-type:lower-roman');
    // CSS cannot say where a counter starts, so the attributes have to survive.
    expect(html).toContain('start="3"');
    expect(html).toContain('type="i"');
  });

  it('keeps the bookmark id and the fragment that points at it', async () => {
    const { html } = await stackMarkup(
      harness,
      reactToHtml(NavigationDocument, 'pdf'),
    );

    expect(html).toContain('id="cetology"');
    expect(html).toContain('href="#cetology"');
    expect(html).toContain('href="https://example.com/"');
  });
});
