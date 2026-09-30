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
import type * as reactComponentsModule from '../reactComponents';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type PreviewApi = typeof reactModule &
  typeof reactDomClientModule &
  typeof reactComponentsModule;

type PreviewResult = {
  mounted: {
    pageCount: number;
    display: string;
    transform: string;
  };
  afterUnmount: {
    childElementCount: number;
  };
  /** Only the observers watching the preview element. */
  previewObservers: {
    created: number;
    disconnected: number;
  };
};

describe('Preview', () => {
  let browser: Browser;
  let harness: BrowserHarness<PreviewApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<PreviewApi>(browser, {
      modules: ['react', 'react-dom/client', '../reactComponents'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  /**
   * Mounts a `Preview` of a one page document in a 400px wide container and
   * unmounts it again, recording what the preview did to the DOM and to its
   * `ResizeObserver`. The observer is tracked through the global constructor so
   * that the component's own API stays untouched.
   */
  const renderPreview = (autoscale: boolean) =>
    harness.evaluate(async (api, isAutoscale: boolean) => {
      const settle = () =>
        new Promise((resolve) => {
          setTimeout(resolve, 200);
        });

      type ObserverRecord = {
        targets: Array<Element>;
        isDisconnected: boolean;
      };
      const observerRecords: Array<ObserverRecord> = [];
      const NativeResizeObserver = window.ResizeObserver;
      window.ResizeObserver = class TrackedResizeObserver extends (
        NativeResizeObserver
      ) {
        private readonly record: ObserverRecord = {
          targets: [],
          isDisconnected: false,
        };
        constructor(callback: ResizeObserverCallback) {
          super(callback);
          observerRecords.push(this.record);
        }
        observe(target: Element, options?: ResizeObserverOptions) {
          this.record.targets.push(target);
          super.observe(target, options);
        }
        disconnect() {
          this.record.isDisconnected = true;
          super.disconnect();
        }
      };

      const containerEl = document.createElement('div');
      containerEl.style.width = '400px';
      document.body.appendChild(containerEl);

      const previewElRef = { current: null as null | HTMLDivElement };
      const root = api.createRoot(containerEl);

      root.render(
        api.createElement(api.Preview, {
          autoscale: isAutoscale,
          elRef: previewElRef,
          children: api.createElement(
            api.DocumentProvider,
            null,
            api.createElement(
              api.Stack,
              null,
              api.createElement('p', null, 'Preview content'),
            ),
          ),
        }),
      );

      await settle();

      const previewEl = previewElRef.current!;
      const documentEl = previewEl.firstElementChild as HTMLElement;
      const mounted = {
        pageCount: documentEl.childElementCount,
        display: previewEl.style.display,
        transform: documentEl.style.transform,
      };

      root.unmount();
      await settle();

      const previewObserverRecords = observerRecords.filter(({ targets }) =>
        targets.includes(previewEl),
      );

      const result = {
        mounted,
        afterUnmount: { childElementCount: previewEl.childElementCount },
        previewObservers: {
          created: previewObserverRecords.length,
          disconnected: previewObserverRecords.filter(
            ({ isDisconnected }) => isDisconnected,
          ).length,
        },
      };

      containerEl.remove();
      window.ResizeObserver = NativeResizeObserver;

      return result;
    }, autoscale);

  it('renders the document into the preview element and clears it on unmount', async () => {
    const { mounted, afterUnmount, previewObservers }: PreviewResult =
      await renderPreview(false);

    expect(mounted.pageCount).toBe(1);
    expect(afterUnmount.childElementCount).toBe(0);

    // Without autoscale the preview neither lays itself out nor observes.
    expect(mounted.display).toBe('');
    expect(mounted.transform).toBe('');
    expect(previewObservers.created).toBe(0);
  });

  it('scales the document to the preview width and disconnects on unmount', async () => {
    const { mounted, previewObservers }: PreviewResult =
      await renderPreview(true);

    expect(mounted.pageCount).toBe(1);
    expect(mounted.display).toBe('flex');
    // An 8.5in (816px) page scaled into a 400px container.
    expect(mounted.transform).toMatch(/^scale\(0\.4/);

    // Every observer the effect created is disconnected again.
    expect(previewObservers.created).toBeGreaterThan(0);
    expect(previewObservers.disconnected).toBe(previewObservers.created);
  });

  it('takes its stylesheets out of the document when it unmounts', async () => {
    const result = await harness.evaluate(async (api) => {
      const settle = () =>
        new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
      const before = document.adoptedStyleSheets.length;

      const containerEl = document.createElement('div');
      document.body.appendChild(containerEl);
      const root = api.createRoot(containerEl);
      const renderDocuments = (text: string) =>
        root.render(
          api.createElement(
            'div',
            null,
            ...['a', 'b'].map((key) =>
              api.createElement(api.Preview, {
                key,
                children: api.createElement(api.DocumentProvider, {
                  variants: { body: { fontSize: '20px' } },
                  children: api.createElement(
                    api.Stack,
                    null,
                    api.createElement(api.Typography, { as: 'p' }, text),
                  ),
                }),
              }),
            ),
          ),
        );

      renderDocuments('First');
      await settle();
      const mounted = document.adoptedStyleSheets.length;

      // A re-render replaces the previous render's stylesheets.
      renderDocuments('Second');
      await settle();
      const rerendered = document.adoptedStyleSheets.length;

      root.unmount();
      containerEl.remove();
      return {
        before,
        mounted,
        rerendered,
        after: document.adoptedStyleSheets.length,
      };
    });

    expect(result.mounted).toBeGreaterThan(result.before);
    expect(result.rerendered).toBe(result.mounted);
    expect(result.after).toBe(result.before);
  });

  it('renders and re-renders a preview inside an iframe', async () => {
    const result = await harness.evaluate(async (api) => {
      const settle = () =>
        new Promise((resolve) => {
          setTimeout(resolve, 300);
        });

      const iframe = document.createElement('iframe');
      iframe.style.width = '1000px';
      iframe.style.height = '1200px';
      document.body.appendChild(iframe);
      const frameDocument = iframe.contentDocument;
      const view = frameDocument?.defaultView;
      if (!frameDocument || !view) {
        throw new Error('The iframe has no document.');
      }
      const containerEl = frameDocument.createElement('div');
      frameDocument.body.appendChild(containerEl);

      const root = api.createRoot(containerEl);
      const renderHeading = (text: string) =>
        root.render(
          api.createElement(api.Preview, {
            children: api.createElement(
              api.DocumentProvider,
              null,
              api.createElement(
                api.Stack,
                null,
                api.createElement('h1', { className: 'probe' }, text),
              ),
            ),
          }),
        );

      const read = () => {
        const page = frameDocument.querySelector('matti-docs-page');
        const heading = frameDocument.querySelector('.probe');
        const content = page?.shadowRoot?.querySelector('[part="content"]');
        return {
          text: heading?.textContent,
          // The light DOM rules reached the heading...
          headingFontSize: heading && view.getComputedStyle(heading).fontSize,
          // ...and the chrome's shadow stylesheet the page regions.
          contentPaddingTop:
            content && view.getComputedStyle(content).paddingTop,
          frameSheets: frameDocument.adoptedStyleSheets.length,
        };
      };

      renderHeading('First');
      await settle();
      const first = read();

      renderHeading('Second');
      await settle();
      const second = read();

      root.unmount();
      const afterUnmount = frameDocument.adoptedStyleSheets.length;
      iframe.remove();
      return { first, second, afterUnmount };
    });

    for (const [render, text] of [
      [result.first, 'First'],
      [result.second, 'Second'],
    ] as const) {
      expect(render).toMatchObject({
        text,
        headingFontSize: '32px',
        contentPaddingTop: '48px',
      });
      expect(render.frameSheets).toBeGreaterThan(0);
    }
    expect(result.second.frameSheets).toBe(result.first.frameSheets);
    expect(result.afterUnmount).toBe(0);
  });

  it('paginates a preview in an iframe under the stylesheets it is shown with', async () => {
    const result = await harness.evaluate(async (api) => {
      const waitForPages = async (targetDocument: Document) => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          if (targetDocument.querySelector('matti-docs-page')) {
            return;
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        }
        throw new Error('The preview rendered no pages.');
      };
      // A consumer stylesheet that changes the page chrome, and so the room
      // pagination has to fill.
      const styleSheets = [':host::part(content) { padding-top: 4in; }'];
      const paragraphs = Array.from({ length: 40 }, (_value, index) =>
        api.createElement('p', { key: index }, `Paragraph ${index}`),
      );
      const renderInto = async (targetDocument: Document) => {
        const containerEl = targetDocument.createElement('div');
        targetDocument.body.appendChild(containerEl);
        const root = api.createRoot(containerEl);
        root.render(
          api.createElement(api.Preview, {
            styleSheets,
            children: api.createElement(
              api.DocumentProvider,
              null,
              api.createElement(api.Stack, null, ...paragraphs),
            ),
          }),
        );
        await waitForPages(targetDocument);
        const pages = Array.from(
          targetDocument.querySelectorAll('matti-docs-page'),
          (page) =>
            Array.from(page.children)
              .filter((child) => !child.slot)
              .map((child) => child.textContent)
              .join('|'),
        );
        root.unmount();
        containerEl.remove();
        return pages;
      };

      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      if (!iframe.contentDocument) {
        throw new Error('The iframe has no document.');
      }
      const inFrame = await renderInto(iframe.contentDocument);
      iframe.remove();
      const inDocument = await renderInto(document);
      return { inDocument, inFrame };
    });

    expect(result.inDocument.length).toBeGreaterThan(1);
    expect(result.inFrame).toEqual(result.inDocument);
  });
});
