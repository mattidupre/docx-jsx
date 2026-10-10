import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../../fixtures/browserHarness';
import type * as entitiesModule from '../../entities';
import type * as generatedStylesModule from '../../generated/styles';
import type * as pageTemplateModule from './pageTemplate';
import type * as documentStylesModule from './documentStyles';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type PageTemplateApi = typeof pageTemplateModule &
  typeof entitiesModule &
  typeof documentStylesModule &
  typeof generatedStylesModule;

describe('PageTemplate', () => {
  let browser: Browser;
  let harness: BrowserHarness<PageTemplateApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<PageTemplateApi>(browser, {
      modules: [
        './pageTemplate',
        '../../entities',
        './documentStyles',
        '../../generated/styles',
      ],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  it('replaces page number and page count counters', async () => {
    const counters = await harness.evaluate((api) => {
      const createCounter = (elementType: 'pagenumber' | 'pagecount') => {
        const counterEl = document.createElement('span');
        const attributes = api.encodeElementData({
          elementType,
          elementOptions: {},
          contentOptions: {},
          variant: undefined,
        });
        for (const key of Object.keys(attributes)) {
          counterEl.setAttribute(key, String(attributes[key]));
        }
        return counterEl;
      };

      const headerEl = document.createElement('div');
      headerEl.append(
        'Page ',
        createCounter('pagenumber'),
        ' of ',
        createCounter('pagecount'),
      );

      const footerEl = document.createElement('div');
      footerEl.append(
        createCounter('pagenumber'),
        '/',
        createCounter('pagecount'),
      );

      const template = new api.PageTemplate({
        prefixes: api.assignPrefixesOptions(),
        size: { width: '8.5in', height: '11in' },
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
          header: '0.5in',
          footer: '0.5in',
        },
        header: headerEl,
        footer: footerEl,
      });

      template.replaceCounters({ pageNumber: 3, pageCount: 7 });

      const textOfSlot = (slot: string) =>
        Array.from(
          template.element.querySelectorAll(`:scope > [slot="${slot}"]`),
          (node) => node.textContent,
        ).join('');

      return {
        header: textOfSlot('header'),
        footer: textOfSlot('footer'),
      };
    });

    expect(counters).toEqual({ header: 'Page 3 of 7', footer: '3/7' });
  });

  it('clones the header and footer but never the content when extending', async () => {
    const templates = await harness.evaluate((api) => {
      const createEl = (tagName: string, text: string) => {
        const element = document.createElement(tagName);
        element.textContent = text;
        return element;
      };

      const template = new api.PageTemplate({
        prefixes: api.assignPrefixesOptions(),
        size: { width: '8.5in', height: '11in' },
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
          header: '0.5in',
          footer: '0.5in',
        },
        header: createEl('div', 'HEADER'),
        content: createEl('div', 'FIRST PAGE'),
        footer: createEl('div', 'FOOTER'),
      });

      // Header and footer are slotted by name; content takes the default slot.
      const readTemplate = ({
        element,
      }: InstanceType<typeof api.PageTemplate>) => {
        const children = Array.from(element.children);
        const textOf = (nodes: ReadonlyArray<Element>) =>
          nodes.map((node) => node.textContent).join('');
        const content = children.filter((child) => !child.slot);
        return {
          header: textOf(children.filter((child) => child.slot === 'header')),
          content: textOf(content),
          footer: textOf(children.filter((child) => child.slot === 'footer')),
          contentChildCount: content.length,
        };
      };

      return {
        original: readTemplate(template),
        withContent: readTemplate(
          template.extend({ content: createEl('div', 'SECOND PAGE') }),
        ),
        withoutContent: readTemplate(template.extend({})),
        // The light DOM order is the reading order: header, content, footer.
        order: Array.from(
          template.extend({ content: createEl('div', 'SECOND PAGE') }).element
            .children,
          (child) => child.slot || 'content',
        ),
      };
    });

    expect(templates.order).toEqual(['header', 'content', 'footer']);

    expect(templates.original).toEqual({
      header: 'HEADER',
      content: 'FIRST PAGE',
      footer: 'FOOTER',
      contentChildCount: 1,
    });

    // Header and footer are carried over; the content is replaced, not merged.
    expect(templates.withContent).toEqual({
      header: 'HEADER',
      content: 'SECOND PAGE',
      footer: 'FOOTER',
      contentChildCount: 1,
    });

    // An extension without content is empty: it must not inherit the previous
    // page's content, and it must not fall back to a clone of the header.
    expect(templates.withoutContent).toEqual({
      header: 'HEADER',
      content: '',
      footer: 'FOOTER',
      contentChildCount: 0,
    });
  });

  it('confines a stylesheet to the page and still lets :host reach its container', async () => {
    const styles = await harness.evaluate((api) => {
      const createProbe = (tagName: string) => {
        const element = document.createElement(tagName);
        element.className = 'style-probe';
        element.textContent = 'probe';
        return element;
      };

      const outsideEl = createProbe('div');
      document.body.appendChild(outsideEl);

      const contentEl = createProbe('p');

      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(
        ':host { color: rgb(1, 2, 3); } .style-probe { font-style: italic; }',
      );
      const documentStyles = api.createDocumentStyles(document);
      documentStyles.adopt(styleSheet, `.${api.PageTemplate.rootClassName}`);

      const template = new api.PageTemplate({
        prefixes: api.assignPrefixesOptions(),
        size: { width: '8.5in', height: '11in' },
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
          header: '0.5in',
          footer: '0.5in',
        },
        content: contentEl,
      });

      document.body.appendChild(template.element);
      try {
        return {
          container: window.getComputedStyle(template.element).color,
          inside: window.getComputedStyle(contentEl).fontStyle,
          outside: window.getComputedStyle(outsideEl).fontStyle,
        };
      } finally {
        template.element.remove();
        outsideEl.remove();
        documentStyles.dispose();
      }
    });

    // `:host` used to select the shadow host the page was rendered into; the
    // page container is now the `@scope` root, which is the same element.
    expect(styles.container).toBe('rgb(1, 2, 3)');
    expect(styles.inside).toBe('italic');
    // Nothing outside the page is styled, which is the containment the shadow
    // root used to provide.
    expect(styles.outside).toBe('normal');
  });

  it.each([
    { headerHeight: 120, footerHeight: 80, expectedHeight: 270 },
    { headerHeight: 10, footerHeight: 10, expectedHeight: 430 },
    { headerHeight: 0, footerHeight: 0, expectedHeight: 430 },
  ])(
    'reserves running content without reducing sufficient margins: %o',
    async (sizes) => {
      const result = await harness.evaluate((api, sizes) => {
        const shadowStyleSheet = new CSSStyleSheet();
        shadowStyleSheet.replaceSync(api.PAGE_SHADOW_STYLES);
        const makeRegion = (height: number) => {
          const element = document.createElement('div');
          element.style.height = `${height}px`;
          return element;
        };
        const template = new api.PageTemplate({
          prefixes: api.assignPrefixesOptions(),
          size: { width: '300px', height: '500px' },
          margin: {
            top: '30px',
            bottom: '40px',
            left: '0px',
            right: '0px',
            header: '10px',
            footer: '20px',
          },
          header: makeRegion(sizes.headerHeight),
          footer: makeRegion(sizes.footerHeight),
          shadowStyleSheets: [shadowStyleSheet],
        });
        document.body.append(template.element);
        const content = makeRegion(sizes.expectedHeight);
        const rendered = template.extend({ content });
        document.body.append(rendered.element);
        try {
          const header = rendered.element.querySelector('[slot="header"]');
          const footer = rendered.element.querySelector('[slot="footer"]');
          if (!header || !footer) {
            throw new Error('Missing running content.');
          }
          const bodyBox = content.getBoundingClientRect();
          return {
            height: template.getContentSize().height,
            headerClear: bodyBox.top >= header.getBoundingClientRect().bottom,
            footerClear: bodyBox.bottom <= footer.getBoundingClientRect().top,
          };
        } finally {
          template.element.remove();
          rendered.element.remove();
        }
      }, sizes);
      expect(result.height).toBe(`${sizes.expectedHeight}px`);
      expect(result.headerClear).toBe(true);
      expect(result.footerClear).toBe(true);
    },
  );

  it('lays out the chrome in a shadow root that a stylesheet reaches through its parts', async () => {
    const result = await harness.evaluate((api) => {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(
        [
          // A host page reset must not reach the page regions...
          'div { padding: 50px !important; box-sizing: border-box; }',
          // ...while a deliberate `::part` rule does.
          'matti-docs-page::part(content) { background-color: rgb(4, 5, 6); }',
        ].join('\n'),
      );
      document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        styleSheet,
      ];

      const shadowStyleSheet = new CSSStyleSheet();
      shadowStyleSheet.replaceSync(api.PAGE_SHADOW_STYLES);

      const template = new api.PageTemplate({
        prefixes: api.assignPrefixesOptions(),
        size: { width: '8in', height: '10in' },
        margin: {
          top: '1in',
          right: '0.5in',
          bottom: '1in',
          left: '0.5in',
          header: '0.5in',
          footer: '0.5in',
        },
        shadowStyleSheets: [shadowStyleSheet],
      });
      document.body.appendChild(template.element);
      try {
        const content =
          template.element.shadowRoot?.querySelector('[part="content"]');
        if (!content) {
          throw new Error('The page has no content part.');
        }
        return {
          tagName: template.element.localName,
          contentBackground: window.getComputedStyle(content).backgroundColor,
          contentSize: template.getContentSize(),
        };
      } finally {
        template.element.remove();
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
          (sheet) => sheet !== styleSheet,
        );
      }
    });

    expect(result.tagName).toBe('matti-docs-page');
    expect(result.contentBackground).toBe('rgb(4, 5, 6)');
    // 8in less 2 * 0.5in, and 10in less 2 * 1in: unaffected by the reset.
    expect(result.contentSize).toEqual({ width: '7in', height: '8in' });
  });
});
