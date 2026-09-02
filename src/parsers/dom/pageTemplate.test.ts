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
import type * as pageTemplateModule from './pageTemplate';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type PageTemplateApi = typeof pageTemplateModule & typeof entitiesModule;

describe('PageTemplate', () => {
  let browser: Browser;
  let harness: BrowserHarness<PageTemplateApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<PageTemplateApi>(browser, {
      modules: ['./pageTemplate', '../../entities'],
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

      return {
        header: template.headerEl.textContent,
        footer: template.footerEl.textContent,
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

      const readTemplate = ({
        headerEl,
        contentEl,
        footerEl,
      }: InstanceType<typeof api.PageTemplate>) => ({
        header: headerEl.textContent,
        content: contentEl.textContent,
        footer: footerEl.textContent,
        contentChildCount: contentEl.children.length,
      });

      return {
        original: readTemplate(template),
        withContent: readTemplate(
          template.extend({ content: createEl('div', 'SECOND PAGE') }),
        ),
        withoutContent: readTemplate(template.extend({})),
      };
    });

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
        styles: [styleSheet],
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
});
