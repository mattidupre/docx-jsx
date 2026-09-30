import type { PageSize } from '../entities';
import { measureStack, type MeasuredStackDom } from './measure';
import type { BoxSize, FragmentationLayout } from './model';
import { placePages } from './place';
import type { FragmentationProfile } from './profile';
import { createFragmentationProfile } from './profiles';
import { renderPage } from './render';

/**
 * The Fragmenter paginates the library's block flow by the conventions of a
 * {@link FragmentationProfile} (Word's by default).
 *
 * Every stack is laid out once, unpaginated, at the content width of the page
 * it starts on, and measured into a block model: border boxes, margins, line
 * and row boundaries. Pages are then filled by arithmetic on that model, and
 * only the chosen fragments are built into page DOM. The content is measured
 * under the same scoped stylesheets and content root it is shown with.
 */

export type OnPageStart = (context: {
  pageIndex: number;
  /** The stack whose content starts the page. */
  stackIndex: number;
  /** Whether the page also starts that stack's content. */
  first: boolean;
}) => PageSize;

export type OnPageRendered = (context: {
  contentElement: HTMLElement;
  pageIndex: number;
}) => void;

export type FragmenterOptions = {
  styles?: ReadonlyArray<HTMLStyleElement | CSSStyleSheet>;
  /**
   * A class for the element content is laid out under while it is measured:
   * the content root the stylesheets are scoped to.
   */
  contentClassName?: string;
  profile?: FragmentationProfile;
};

export type FragmentedStack = {
  element: HTMLElement;
  /** Carries on down the page of the stack before it instead of a new one. */
  continuous: boolean;
};

export type ToPagesOptions = {
  stacks: ReadonlyArray<FragmentedStack>;
  /** Called before a page is filled; returns the size of its content box. */
  onPageStart: OnPageStart;
  onPageRendered?: OnPageRendered;
};

/**
 * Pagination measures text, so every face has to be loaded first, not only
 * the ones already used.
 */
const loadFonts = async () => {
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.fonts, (fontFace) =>
      fontFace.load().catch((error: unknown) => {
        console.error(`Could not load the font ${fontFace.family}`, error);
      }),
    ),
  );
};

export class Fragmenter {
  readonly styleSheets: ReadonlyArray<CSSStyleSheet>;

  readonly styleElements: ReadonlyArray<HTMLStyleElement>;

  readonly contentClassName: undefined | string;

  readonly profile: FragmentationProfile;

  constructor({
    styles = [],
    contentClassName,
    profile = createFragmentationProfile('word'),
  }: FragmenterOptions = {}) {
    this.styleSheets = styles.filter(
      (style): style is CSSStyleSheet => style instanceof CSSStyleSheet,
    );
    this.styleElements = styles.filter(
      (style): style is HTMLStyleElement => style instanceof HTMLStyleElement,
    );
    this.contentClassName = contentClassName;
    this.profile = profile;
  }

  /**
   * Paginates the stacks and renders every page. Resolves to the layout a
   * target that cannot lay out needs to follow the pages: the packed order of
   * masonry columns.
   */
  async toPages({
    stacks,
    onPageStart,
    onPageRendered,
  }: ToPagesOptions): Promise<FragmentationLayout> {
    await loadFonts();

    const hostElement = document.createElement('div');
    hostElement.style.setProperty('visibility', 'hidden');
    hostElement.style.setProperty('position', 'absolute');
    hostElement.style.setProperty('pointer-events', 'none');
    hostElement.style.setProperty('z-index', '-9999');
    document.body.appendChild(hostElement);
    try {
      const shadowRoot = hostElement.attachShadow({ mode: 'closed' });
      shadowRoot.adoptedStyleSheets.push(...this.styleSheets);
      shadowRoot.append(
        ...this.styleElements.map((style) => style.cloneNode(true)),
      );
      const root = document.createElement('div');
      if (this.contentClassName) {
        root.classList.add(this.contentClassName);
      }
      shadowRoot.appendChild(root);

      const sizes = new Map<string, BoxSize>();
      const resolveSize = ({ width, height }: PageSize): BoxSize => {
        const key = `${width} ${height}`;
        let size = sizes.get(key);
        if (!size) {
          const probe = document.createElement('div');
          probe.style.setProperty('position', 'absolute');
          probe.style.setProperty('width', width);
          probe.style.setProperty('height', height);
          root.appendChild(probe);
          const rect = probe.getBoundingClientRect();
          probe.remove();
          size = { width: rect.width, height: rect.height };
          sizes.set(key, size);
        }
        return size;
      };

      const stackDoms: Array<MeasuredStackDom> = [];
      const { pages, packedOrder } = placePages({
        profile: this.profile,
        stacks,
        measureStack: (stackIndex, size) => {
          const stackDom = measureStack({
            root,
            profile: this.profile,
            stackSource: stacks[stackIndex].element,
            stackIndex,
            size,
          });
          stackDoms[stackIndex] = stackDom;
          return stackDom.stack;
        },
        startPage: (context) => resolveSize(onPageStart(context)),
      });

      pages.forEach((page, pageIndex) => {
        const contentElement = renderPage(page, (stackIndex) => {
          const stackDom = stackDoms[stackIndex];
          if (!stackDom) {
            throw new Error(`Stack ${stackIndex + 1} was never measured.`);
          }
          return stackDom;
        });
        onPageRendered?.({ contentElement, pageIndex });
      });

      return {
        stackCount: stacks.length,
        masonryStacks: stackDoms.flatMap((stackDom, stackIndex) => {
          const masonry = stackDom.stack.blocks.find(
            ({ region }) => region?.masonry,
          )?.region?.masonry;
          return masonry ? [{ stackIndex, unitCount: masonry.unitCount }] : [];
        }),
        packedOrder,
      };
    } finally {
      hostElement.remove();
    }
  }
}
