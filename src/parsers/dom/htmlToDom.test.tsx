import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import {
  Bookmark,
  Break,
  DocumentProvider,
  Link,
  Raw,
  Stack,
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

type PageSummary = {
  header: string;
  footer: string;
  content: string;
};

/**
 * Runs `htmlToDom` in the page and flattens each rendered page into the text of
 * its header, footer and content areas.
 */
const readPages = (harness: BrowserHarness<DomApi>, html: string) =>
  harness.evaluate(async (api, pageHtml: string): Promise<PageSummary[]> => {
    const pagesEl = await api.htmlToDom(pageHtml);
    return Array.from(pagesEl.children).map((pageEl) => {
      // Header and footer are slotted by name; content takes the default slot.
      const textOf = (slot: string) =>
        Array.from(pageEl.children)
          .filter((child) => child.slot === slot)
          .map((child) => child.textContent)
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
      return {
        header: textOf('header'),
        footer: textOf('footer'),
        content: textOf(''),
      };
    });
  }, html);

const createLayouts = (name: string) => ({
  first: {
    header: <p>{`${name} first header`}</p>,
    footer: <p>{`${name} first footer`}</p>,
  },
  subsequent: {
    header: <p>{`${name} subsequent header`}</p>,
    footer: <p>{`${name} subsequent footer`}</p>,
  },
});

describe('running content clearance', () => {
  it('paginates with each layout’s running content height and renders without overlap', async () => {
    const browser = await launchTestBrowser();
    const harness = await createBrowserHarness<DomApi>(browser, {
      modules: ['./htmlToDom', './pageTemplate'],
      resolveDir: RESOLVE_DIR,
    });
    try {
      const html = reactToHtml(
        () => (
          <DocumentProvider size={{ width: '300px', height: '400px' }}>
            <Stack
              margin={{
                top: '30px',
                bottom: '30px',
                header: '10px',
                footer: '10px',
              }}
              layouts={{
                first: {
                  header: (
                    <p style={{ height: '120px', margin: 0 }}>First header</p>
                  ),
                  footer: (
                    <p style={{ height: '80px', margin: 0 }}>First footer</p>
                  ),
                },
                subsequent: {
                  header: (
                    <p style={{ height: '20px', margin: 0 }}>Later header</p>
                  ),
                  footer: (
                    <p style={{ height: '20px', margin: 0 }}>Later footer</p>
                  ),
                },
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <p
                  key={index}
                  data-body-block
                  style={{ height: '80px', margin: 0, breakInside: 'avoid' }}
                >
                  {`Block ${index}`}
                </p>
              ))}
            </Stack>
          </DocumentProvider>
        ),
        'pdf',
      );
      const pages = await harness.evaluate(async (api, html) => {
        const pagesEl = await api.htmlToDom(html);
        document.body.append(pagesEl);
        try {
          return Array.from(pagesEl.children).map((page) => {
            const header = page.querySelector('[slot="header"]');
            const footer = page.querySelector('[slot="footer"]');
            if (!header || !footer) {
              throw new Error('Missing running content.');
            }
            const blocks = Array.from(
              page.querySelectorAll('[data-body-block]'),
            );
            return {
              text: blocks.map((block) => block.textContent),
              clear: blocks.every((block) => {
                const bounds = block.getBoundingClientRect();
                return (
                  bounds.top >= header.getBoundingClientRect().bottom &&
                  bounds.bottom <= footer.getBoundingClientRect().top
                );
              }),
            };
          });
        } finally {
          pagesEl.remove();
        }
      }, html);
      expect(pages).toEqual([
        { text: ['Block 0', 'Block 1'], clear: true },
        { text: ['Block 2', 'Block 3', 'Block 4', 'Block 5'], clear: true },
      ]);
    } finally {
      await harness.close();
      await closeTestBrowser(browser);
    }
  });
});

const paragraphs = (prefix: string, count: number) =>
  Array.from({ length: count }, (_value, index) => (
    <p key={`${prefix}_${index}`}>{`${prefix}${index}`}</p>
  ));

/**
 * 53 default-sized lines fill the 10in content area of a default page, so the
 * continuous stack B starts part way down page one and overflows onto page two.
 */
function StraddlingStacksDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('A')}>{paragraphs('A', 40)}</Stack>
      <Stack continuous layouts={createLayouts('B')}>
        {paragraphs('B', 40)}
      </Stack>
    </DocumentProvider>
  );
}

/**
 * A forced break before the first element of the continuous stack B, so page
 * two starts exactly at the start of B.
 */
function ContinuousStackOnItsOwnPageDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('A')}>
        <p>A0</p>
      </Stack>
      <Stack continuous layouts={createLayouts('B')}>
        <p style={{ breakBefore: 'page' }}>B0</p>
        <p>B1</p>
      </Stack>
    </DocumentProvider>
  );
}

/** Numbered words, so a lost or repeated one shows. */
const WORDS = Array.from({ length: 3000 }, (_value, index) => `w${index}`);

/**
 * A continuous stack with much wider margins than the stack before it: it
 * starts on that stack's page, at that page's width, and goes on to pages of
 * its own, which are 3.5in wide rather than 7.5in.
 */
function NarrowerContinuousStackDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>A0</p>
      </Stack>
      <Stack continuous margin={{ left: '2.5in', right: '2.5in' }}>
        <p>{WORDS.join(' ')}</p>
      </Stack>
    </DocumentProvider>
  );
}

function SinglePageDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('Only')}>
        <p>Only content</p>
      </Stack>
    </DocumentProvider>
  );
}

function BreakDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('Break')}>
        <p>Before</p>
        <Break />
        <p>After</p>
      </Stack>
    </DocumentProvider>
  );
}

/**
 * A break that ends its parent has no next sibling of its own, so it has to
 * reach the parent's next sibling to mean anything.
 */
function NestedBreakDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('Break')}>
        <Raw as="div">
          <p>Before</p>
          <Break />
        </Raw>
        <p>After</p>
      </Stack>
    </DocumentProvider>
  );
}

/**
 * Word ends a document whose last element is a page break with a blank page,
 * and the DOCX target emits that break, so the DOM and PDF targets have to
 * produce the page too.
 */
function TrailingBreakDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={createLayouts('Trailing')}>
        <p>Before</p>
        <Break />
      </Stack>
    </DocumentProvider>
  );
}

const BOOKMARK_ID = 'cetology';

function BookmarkDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p>
          <Link to={`#${BOOKMARK_ID}`}>Jump</Link>
        </p>
        <Break />
        <h2>
          <Bookmark id={BOOKMARK_ID}>Cetology</Bookmark>
        </h2>
      </Stack>
    </DocumentProvider>
  );
}

const SCOPE_PROBE_CLASS_NAME = 'scope-probe';

function ScopeProbeDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <p className={SCOPE_PROBE_CLASS_NAME}>Inside</p>
      </Stack>
    </DocumentProvider>
  );
}

function ColumnBreakDocument() {
  return (
    <DocumentProvider>
      <Stack columns={{ columnCount: 2, columnGap: '0.5in' }}>
        <p id="before">Before</p>
        <Break />
        <p id="after">After</p>
      </Stack>
    </DocumentProvider>
  );
}

describe('htmlToDom', () => {
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

  it('renders one page with the layout of its only stack', async () => {
    const pages = await readPages(
      harness,
      reactToHtml(SinglePageDocument, 'pdf'),
    );
    expect(pages).toEqual([
      {
        header: 'Only first header',
        footer: 'Only first footer',
        content: 'Only content',
      },
    ]);
  });

  it('gives a straddling page the layout of the stack that starts it', async () => {
    const pages = await readPages(
      harness,
      reactToHtml(StraddlingStacksDocument, 'pdf'),
    );

    expect(pages).toHaveLength(2);

    // Page one starts inside stack A, so it keeps A's first-page layout even
    // though the continuous stack B also contributes content to it, and none
    // of that content is dropped.
    expect(pages[0].header).toBe('A first header');
    expect(pages[0].footer).toBe('A first footer');
    expect(pages[0].content.startsWith('A0A1A2')).toBe(true);
    expect(pages[0].content).toContain('B0');

    // Page two resumes part way through stack B.
    expect(pages[1].header).toBe('B subsequent header');
    expect(pages[1].footer).toBe('B subsequent footer');
    expect(pages[1].content.endsWith('B39')).toBe(true);

    // Every paragraph appears exactly once across the two pages.
    const allContent = pages.map(({ content }) => content).join('');
    for (let index = 0; index < 40; index += 1) {
      expect(allContent).toContain(`A${index}`);
      expect(allContent).toContain(`B${index}`);
    }
  });

  it('starts a new page at a Break', async () => {
    const pages = await readPages(harness, reactToHtml(BreakDocument, 'pdf'));

    expect(pages).toHaveLength(2);
    expect(pages[0].content).toBe('Before');
    expect(pages[1].content).toBe('After');
    // The second page resumes the stack rather than restarting it.
    expect(pages[1].header).toBe('Break subsequent header');
  });

  it('starts a new page at a Break that ends its parent', async () => {
    const pages = await readPages(
      harness,
      reactToHtml(NestedBreakDocument, 'pdf'),
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].content).toBe('Before');
    expect(pages[1].content).toBe('After');
  });

  it('ends the document with a blank page at a trailing Break', async () => {
    const pages = await readPages(
      harness,
      reactToHtml(TrailingBreakDocument, 'pdf'),
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].content).toBe('Before');
    expect(pages[1].content).toBe('');
    // The blank page still belongs to the stack, so it carries the running
    // header and footer -- which is what Word puts on its trailing page too.
    expect(pages[1].header).toBe('Trailing subsequent header');
    expect(pages[1].footer).toBe('Trailing subsequent footer');
  });

  it('renders pages in the light DOM so a bookmark is reachable from the document', async () => {
    // Chrome resolves `href="#id"` against the document, both when it decides
    // an internal link is worth an annotation and when it records where that
    // annotation lands. Neither lookup enters a shadow root, so the whole PDF
    // jump rests on these two elements being findable from `document`.
    const reach = await harness.evaluate(
      async (api, pageHtml: string) => {
        const pagesEl = await api.htmlToDom(pageHtml);
        document.body.appendChild(pagesEl);
        try {
          const pageEls = Array.from(pagesEl.children);
          const pageIndexOf = (element: null | Element) =>
            pageEls.findIndex((pageEl) => element && pageEl.contains(element));
          return {
            targetPageIndex: pageIndexOf(document.getElementById('cetology')),
            linkPageIndex: pageIndexOf(
              document.querySelector('a[href="#cetology"]'),
            ),
          };
        } finally {
          pagesEl.remove();
        }
      },
      reactToHtml(BookmarkDocument, 'pdf'),
    );

    expect(reach).toEqual({ targetPageIndex: 1, linkPageIndex: 0 });
  });

  it('keeps the document stylesheet inside the pages it renders', async () => {
    const colors = await harness.evaluate(
      async (api, pageHtml: string, className: string) => {
        const outsideEl = document.createElement('p');
        outsideEl.className = className;
        outsideEl.textContent = 'Outside';
        document.body.appendChild(outsideEl);

        const pagesEl = await api.htmlToDom(pageHtml, {
          styleSheets: [`.${className} { color: rgb(1, 2, 3); }`],
        });
        document.body.appendChild(pagesEl);
        try {
          const insideEl = pagesEl.querySelector(`.${className}`)!;
          return {
            inside: window.getComputedStyle(insideEl).color,
            outside: window.getComputedStyle(outsideEl).color,
          };
        } finally {
          pagesEl.remove();
          outsideEl.remove();
        }
      },
      reactToHtml(ScopeProbeDocument, 'pdf'),
      SCOPE_PROBE_CLASS_NAME,
    );

    expect(colors.inside).toBe('rgb(1, 2, 3)');
    // Page content is no longer encapsulated by a shadow root, so `@scope` is
    // the only thing keeping a document's styles out of the application that
    // embeds the preview.
    expect(colors.outside).toBe('rgb(0, 0, 0)');
  });

  it('starts a new column, not a new page, at a Break inside columns', async () => {
    const layout = await harness.evaluate(
      async (api, pageHtml: string) => {
        const pagesEl = await api.htmlToDom(pageHtml);
        // Offsets only exist once the pages are laid out in the document.
        document.body.appendChild(pagesEl);

        const readLeft = (pageRootEl: Element, id: string) => {
          const element = pageRootEl.querySelector(`#${id}`);
          return element
            ? Math.round(element.getBoundingClientRect().left)
            : undefined;
        };

        const [pageRootEl] = Array.from(pagesEl.children);
        return {
          pageCount: pagesEl.children.length,
          before: readLeft(pageRootEl, 'before'),
          after: readLeft(pageRootEl, 'after'),
        };
      },
      reactToHtml(ColumnBreakDocument, 'pdf'),
    );

    // A column break never adds a page, and both paragraphs stay on it.
    expect(layout.pageCount).toBe(1);
    expect(layout.before).toBeDefined();
    expect(layout.after).toBeDefined();
    // The second paragraph is in the second column, to the right of the first.
    expect(layout.after!).toBeGreaterThan(layout.before!);
  });

  it('keeps content inside the page area when styles depend on the stack element', async () => {
    const overflows = await harness.evaluate(
      async (api, pageHtml: string) => {
        // B0 is the first child of stack B while it is measured. Unwrapped
        // onto a page after A's paragraphs, it would gain this margin and push
        // the page past its content area.
        const pagesEl = await api.htmlToDom(pageHtml, {
          styleSheets: ['p:not(:first-child) { margin-top: 0.5in; }'],
        });
        document.body.appendChild(pagesEl);
        try {
          return Array.from(pagesEl.children).map((pageRootEl) => {
            // The content region is a part of the page's shadow root; the
            // content itself is the light DOM that is not slotted into the
            // header or footer.
            const contentEl =
              pageRootEl.shadowRoot?.querySelector('[part="content"]');
            if (!contentEl) {
              throw new Error('The page has no content part.');
            }
            const areaBottom =
              contentEl.getBoundingClientRect().bottom -
              Number.parseFloat(
                window.getComputedStyle(contentEl).paddingBottom,
              );
            const contentParagraphs = Array.from(
              pageRootEl.querySelectorAll('p'),
            ).filter((paragraphEl) => !paragraphEl.closest('[slot]'));
            const contentBottom = Math.max(
              ...contentParagraphs.map((paragraphEl) =>
                Math.round(paragraphEl.getBoundingClientRect().bottom),
              ),
            );
            return contentBottom - Math.round(areaBottom);
          });
        } finally {
          pagesEl.remove();
        }
      },
      reactToHtml(StraddlingStacksDocument, 'pdf'),
    );

    expect(overflows.length).toBeGreaterThan(1);
    for (const overflow of overflows) {
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  it('measures what is left of a stack again at the margins of its own pages', async () => {
    const pages = await harness.evaluate(
      async (api, pageHtml: string) => {
        const pagesEl = await api.htmlToDom(pageHtml);
        document.body.appendChild(pagesEl);
        try {
          return Array.from(pagesEl.children).map((pageRootEl) => {
            const contentEl =
              pageRootEl.shadowRoot?.querySelector('[part="content"]');
            if (!contentEl) {
              throw new Error('The page has no content part.');
            }
            const areaBottom =
              contentEl.getBoundingClientRect().bottom -
              Number.parseFloat(
                window.getComputedStyle(contentEl).paddingBottom,
              );
            const contentParagraphs = Array.from(
              pageRootEl.querySelectorAll('p'),
            ).filter((paragraphEl) => !paragraphEl.closest('[slot]'));
            return {
              overflow:
                Math.max(
                  ...contentParagraphs.map((paragraphEl) =>
                    Math.round(paragraphEl.getBoundingClientRect().bottom),
                  ),
                ) - Math.round(areaBottom),
              text: contentParagraphs
                .map((paragraphEl) => paragraphEl.textContent ?? '')
                .join(' '),
            };
          });
        } finally {
          pagesEl.remove();
        }
      },
      reactToHtml(NarrowerContinuousStackDocument, 'pdf'),
    );

    expect(pages.length).toBeGreaterThan(2);
    // Measured at the first page's width, the rest would take fewer lines
    // than it wraps to on the narrower pages, and run past their bottom.
    for (const { overflow } of pages) {
      expect(overflow).toBeLessThanOrEqual(0);
    }
    // It carries on from the word it stopped at, and loses none.
    expect(
      pages
        .map(({ text }) => text)
        .join(' ')
        .split(/\s+/),
    ).toEqual(['A0', ...WORDS]);
  });

  it('gives a continuous stack its first layout when it starts a page', async () => {
    const pages = await readPages(
      harness,
      reactToHtml(ContinuousStackOnItsOwnPageDocument, 'pdf'),
    );

    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual({
      header: 'A first header',
      footer: 'A first footer',
      content: 'A0',
    });
    expect(pages[1]).toEqual({
      header: 'B first header',
      footer: 'B first footer',
      content: 'B0B1',
    });
  });
});
