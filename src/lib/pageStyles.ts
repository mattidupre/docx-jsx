import { PAGE_CLASS_NAMES, PAGE_VARS } from '../entities';
import type { CssRulesArray } from '../utils/css';

/**
 * The parts of a page's shadow tree, and the classes its stylesheet selects
 * them by. A consumer reaches them as `matti-docs-page::part(content)`.
 */
export const PAGE_PARTS = ['header', 'content', 'footer'] as const;

export type PagePart = (typeof PAGE_PARTS)[number];

/** The shadow tree's own page box, inside the host. */
export const PAGE_BOX_CLASS_NAME = 'page';

const REGION_WIDTH = `calc(100% - ${PAGE_VARS.ref('marginLeft')} - ${PAGE_VARS.ref('marginRight')})`;

/**
 * The page box and its header, content and footer regions, laid out from the
 * `--page-*` geometry the page element carries. They live in the page's
 * shadow root, which no host page rule reaches; the content itself stays in
 * the light DOM and is slotted in.
 *
 * `box-sizing` is declared on every region because the shadow stylesheet
 * carries Panda's preflight, as matti-kit's shadow stylesheets do, and the
 * content region's measured height has to exclude its padding.
 */
export const createPageShadowStyleArray = (): CssRulesArray => [
  [':host', { display: 'block' }],
  [':host([hidden])', { display: 'none' }],
  [
    `.${PAGE_BOX_CLASS_NAME}`,
    {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',

      width: PAGE_VARS.ref('width'),
      minWidth: PAGE_VARS.ref('width'),
      maxWidth: PAGE_VARS.ref('width'),

      height: PAGE_VARS.ref('height'),
      minHeight: PAGE_VARS.ref('height'),
      maxHeight: PAGE_VARS.ref('height'),

      paddingRight: PAGE_VARS.ref('marginRight'),
      paddingLeft: PAGE_VARS.ref('marginLeft'),
    },
  ],
  [
    '.header',
    {
      boxSizing: 'content-box',
      width: REGION_WIDTH,
      position: 'absolute',
      top: PAGE_VARS.ref('marginHeader'),
    },
  ],
  [
    '.content',
    {
      boxSizing: 'content-box',
      display: 'block',
      position: 'relative',
      width: '100%',
      minHeight: 0,
      flexGrow: 1,
      columns: 'auto',

      paddingTop: PAGE_VARS.ref('marginTop'),
      paddingBottom: PAGE_VARS.ref('marginBottom'),
    },
  ],
  [
    '.footer',
    {
      boxSizing: 'content-box',
      width: REGION_WIDTH,
      position: 'absolute',
      bottom: PAGE_VARS.ref('marginFooter'),
    },
  ],
];

/**
 * The rules pagedjs's own stylesheet applies to an element it split across
 * two pages, for the page the element ends up displayed on. They select the
 * light DOM content below the page element, rooted at `root` as the other
 * content rules are, and keep the specificity they always had.
 */
export const createPageSplitStyleArray = ({
  root,
}: {
  root: string;
}): CssRulesArray => {
  const page = `:where(${root})${PAGE_CLASS_NAMES.selector('page')}`;
  return [
    [
      `${page} [data-split-from]`,
      {
        counterIncrement: 'unset',
        counterReset: 'unset',
        textIndent: 'unset',
        marginTop: 'unset',
        paddingTop: 'unset',
        initialLetter: 'unset',
      },
    ],
    [
      `${page} [data-split-to]`,
      {
        marginBottom: 'unset',
        paddingBottom: 'unset',
      },
    ],
    [
      `${page} [data-split-from] > *::first-letter, ${page} [data-split-from]::first-letter`,
      {
        color: 'unset',
        fontSize: 'unset',
        fontWeight: 'unset',
        fontFamily: 'unset',
        lineHeight: 'unset',
        float: 'unset',
        padding: 'unset',
        margin: 'unset',
      },
    ],
    [
      `${page} [data-split-to]:not([data-footnote-call])::after`,
      {
        content: 'unset',
      },
    ],
    [
      `${page} [data-split-from]:not([data-footnote-call])::before`,
      {
        content: 'unset',
      },
    ],
    [
      `${page} li[data-split-from]:first-of-type`,
      {
        listStyle: 'none',
      },
    ],
    [
      `${page} [data-align-last-split-element='justify']`,
      {
        textAlignLast: 'justify',
      },
    ],
  ];
};
