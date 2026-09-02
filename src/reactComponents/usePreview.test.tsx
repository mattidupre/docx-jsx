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
  /** Only the observers watching the preview element, not pagedjs's own. */
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
});
