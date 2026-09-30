import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  Divider,
  DocumentProvider,
  Grid,
  GridItem,
  Spacer,
  Stack,
  Typography,
} from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import type * as htmlToDomModule from './htmlToDom';
import type * as pageTemplateModule from './pageTemplate';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type DomApi = typeof htmlToDomModule & typeof pageTemplateModule;

const PROBES = [
  'probe-plain',
  'probe-variant',
  'probe-inline',
  'probe-fallback',
  'probe-spacer',
  'probe-divider',
  'probe-grid-item',
  'probe-after',
] as const;

type ProbeMeasurement = {
  pageIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: string;
  lineHeight: string;
  marginTop: string;
  marginBottom: string;
};

type Measurements = {
  pageCount: number;
  probes: Record<string, ProbeMeasurement>;
};

/**
 * Every kind of length a document can write in `rem`: a variant, an inline
 * typography option, the literal fallback of a `var()` chain, a component's
 * own geometry (spacer, divider, grid gap) and the page margins.
 */
function RemDocument() {
  return (
    <DocumentProvider
      variants={{
        roomy: {
          fontSize: '1.25rem',
          lineHeight: '1.5rem',
          marginBottom: '1rem',
        },
      }}
    >
      <Stack margin={{ top: '3rem', left: '2rem' }}>
        <Typography as="p" className="probe-plain">
          Plain body text.
        </Typography>
        <Typography as="p" variant="roomy" className="probe-variant">
          A variant in rem.
        </Typography>
        <Typography as="p" fontSize="0.75rem" className="probe-inline">
          An inline option in rem.
        </Typography>
        <Typography
          as="p"
          fontSize={['--undefined-host-size', '1.5rem']}
          className="probe-fallback"
        >
          A fallback chain ending in rem.
        </Typography>
        <Spacer height="2rem" className="probe-spacer" />
        <Divider className="probe-divider" />
        <Grid columnGap="1rem">
          <GridItem size={6}>
            <Typography as="p" className="probe-grid-item">
              A grid item.
            </Typography>
          </GridItem>
          <GridItem size={6}>
            <p>Its sibling.</p>
          </GridItem>
        </Grid>
        <Typography as="p" className="probe-after">
          After everything.
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}

/**
 * Renders `html` with the host's root font size set to `rootFontSize` (or
 * left alone) and measures every probe relative to the page it landed on.
 */
const measure = (
  harness: BrowserHarness<DomApi>,
  html: string,
  rootFontSize: null | string,
) =>
  harness.evaluate(
    async (
      api,
      pageHtml: string,
      fontSize: null | string,
      probes: ReadonlyArray<string>,
    ): Promise<Measurements> => {
      document.body.replaceChildren();
      document.documentElement.style.fontSize = fontSize ?? '';
      const pagesEl = await api.htmlToDom(pageHtml);
      document.body.append(pagesEl);
      const pageRoots = Array.from(pagesEl.children);
      const result: Measurements = { pageCount: pageRoots.length, probes: {} };
      for (const probe of probes) {
        const element = pagesEl.querySelector(`.${probe}`);
        if (!element) {
          throw new Error(`Probe ${probe} was not rendered.`);
        }
        const pageRoot = element.closest(`.${api.PageTemplate.rootClassName}`);
        if (!pageRoot) {
          throw new Error(`Probe ${probe} is not inside a page.`);
        }
        const pageRect = pageRoot.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        result.probes[probe] = {
          pageIndex: pageRoots.indexOf(pageRoot),
          top: rect.top - pageRect.top,
          left: rect.left - pageRect.left,
          width: rect.width,
          height: rect.height,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
        };
      }
      return result;
    },
    html,
    rootFontSize,
    [...PROBES],
  );

describe('a host page with a different root font size', () => {
  let browser: Browser;
  let harness: BrowserHarness<DomApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<DomApi>(browser, {
      modules: ['./htmlToDom', './pageTemplate'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  /**
   * The DOCX target resolves `rem` against 16px no matter where the document
   * is shown, so the browser targets have to as well: a host with
   * `html { font-size: 20px }` must not scale the typography or move anything.
   */
  it('lays the document out exactly as a blank page does', async () => {
    const html = reactToHtml(RemDocument, 'pdf');

    const blank = await measure(harness, html, null);
    const hosted = await measure(harness, html, '20px');

    expect(hosted).toEqual(blank);

    // The blank page is the reference DOCX agrees with: 1rem is 16px.
    expect(blank.probes['probe-plain'].fontSize).toBe('16px');
    expect(blank.probes['probe-variant']).toMatchObject({
      fontSize: '20px',
      lineHeight: '24px',
      marginBottom: '16px',
    });
    expect(blank.probes['probe-inline'].fontSize).toBe('12px');
    expect(blank.probes['probe-fallback'].fontSize).toBe('24px');
    expect(blank.probes['probe-spacer'].height).toBe(32);
    expect(blank.probes['probe-divider']).toMatchObject({
      marginTop: '8px',
      marginBottom: '8px',
    });
    // 3rem of top margin, 2rem of left margin.
    expect(blank.probes['probe-plain']).toMatchObject({ top: 48, left: 32 });
  });
});
