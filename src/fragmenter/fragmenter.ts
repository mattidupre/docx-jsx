import type { PageSize } from '../entities';
import {
  measureStack,
  type MeasuredStackDom,
  type StyledElement,
} from './measure';
import type { BlockKind, BoxSize, FragmentationLayout } from './model';
import { placePages, wantsRepeatedHeader } from './place';
import type { FragmentationProfile } from './profile';
import { createFragmentationProfile } from './profiles';
import { continueStack, renderPage } from './render';

/**
 * The Fragmenter paginates the library's block flow by the conventions of a
 * {@link FragmentationProfile} (Word's by default).
 *
 * Every stack is laid out, unpaginated, at the content width of the page it
 * starts on, and measured into a block model: border boxes, margins, line
 * and row boundaries. Pages are then filled by arithmetic on that model, and
 * only the chosen fragments are built into page DOM. What is left of a stack
 * is laid out and measured again on a page of another width, a block split
 * before carrying on from the same place in its content. The content is
 * measured under the same scoped stylesheets and content root it is shown
 * with.
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
  /**
   * The font families the document configures (its `fonts`). Their faces are
   * loaded before measuring, as are those of every family the content's
   * elements resolve `font-family` to.
   */
  fontFamilies?: ReadonlyArray<string>;
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

/** A family name as `font-family` and `FontFace.family` spell it, unquoted. */
const toFamilyKey = (family: string): string =>
  family
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .toLowerCase();

/**
 * Every family `root`'s content resolves `font-family` to, read off its laid
 * out elements, whether or not the browser picked that family in the end.
 */
const resolvedFamiliesOf = (root: Element): Array<string> =>
  [root, ...Array.from(root.querySelectorAll('*'))].flatMap((element) =>
    getComputedStyle(element).fontFamily.split(','),
  );

/**
 * Pagination measures text, so the faces of every family the content uses
 * are loaded first, not only those of the text shown so far. A face of a
 * family the content never names (the host page's own fonts) is left alone.
 */
const loadFonts = async (families: ReadonlyArray<string>) => {
  const used = new Set(families.map(toFamilyKey));
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.fonts)
      .filter((fontFace) => used.has(toFamilyKey(fontFace.family)))
      .map((fontFace) =>
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

  readonly fontFamilies: ReadonlyArray<string>;

  constructor({
    styles = [],
    contentClassName,
    profile = createFragmentationProfile('word'),
    fontFamilies = [],
  }: FragmenterOptions = {}) {
    this.styleSheets = styles.filter(
      (style): style is CSSStyleSheet => style instanceof CSSStyleSheet,
    );
    this.styleElements = styles.filter(
      (style): style is HTMLStyleElement => style instanceof HTMLStyleElement,
    );
    this.contentClassName = contentClassName;
    this.profile = profile;
    this.fontFamilies = fontFamilies;
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

      // The families come from the content laid out under its own styles.
      const families = [...this.fontFamilies];
      for (const { element } of stacks) {
        const clone = element.cloneNode(true);
        if (clone instanceof Element) {
          root.appendChild(clone);
          families.push(...resolvedFamiliesOf(clone));
          clone.remove();
        }
      }
      await loadFonts(families);

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

      /** Every measurement of every stack, by stack, in order. */
      const stackDoms: Array<Array<MeasuredStackDom>> = [];
      const { pages, packedOrder } = placePages({
        profile: this.profile,
        stacks,
        measureStack: (stackIndex, size, continuations) => {
          const measurements = (stackDoms[stackIndex] ??= []);
          const previous = measurements.at(-1);
          if (continuations.length > 0 && !previous) {
            throw new Error(`Stack ${stackIndex + 1} was never measured.`);
          }
          const { source, continuations: continued } =
            previous && continuations.length > 0
              ? continueStack(previous, continuations, (block) =>
                  wantsRepeatedHeader(this.profile, block),
                )
              : {
                  source: stacks[stackIndex].element,
                  continuations: new Map<StyledElement, BlockKind>(),
                };
          const stackDom = measureStack({
            root,
            profile: this.profile,
            stackSource: source,
            stackIndex,
            size,
            measurement: measurements.length,
            continuations: continued,
          });
          measurements.push(stackDom);
          return stackDom.stack;
        },
        startPage: (context) => resolveSize(onPageStart(context)),
      });

      pages.forEach((page, pageIndex) => {
        const contentElement = renderPage(page, (block) => {
          const stackDom = stackDoms[block.stackIndex]?.[block.measurement];
          if (!stackDom) {
            throw new Error(
              `Stack ${block.stackIndex + 1} was never measured that way.`,
            );
          }
          return stackDom;
        });
        onPageRendered?.({ contentElement, pageIndex });
      });

      return {
        stackCount: stacks.length,
        masonryStacks: stackDoms.flatMap((measurements, stackIndex) => {
          const masonry = measurements[0]?.stack.blocks.find(
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
