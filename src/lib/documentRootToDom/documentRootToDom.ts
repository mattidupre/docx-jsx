import { getLayoutByIndex } from 'src/entities/primitives';
import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
  DEFAULT_STACK_OPTIONS,
} from 'src/entities/elements';
import { Pager } from 'src/utils/pager';
import { treeToFragment, type TreeRoot } from 'src/entities/tree';
import { layoutsToTemplates } from './layoutsToTemplates';
import { merge } from 'lodash';

type Options = {
  styleSheets?: Array<CSSStyleSheet>;
};

const LAYOUT_START_POSITION = 'right';

export const documentRootToDom = async (
  { options: documentOptions, stacks: stacksOption }: DocumentRoot<TreeRoot>,
  { styleSheets: styleSheetsOption = [] }: Options = {},
): Promise<HTMLDivElement> => {
  const { size } = merge(DEFAULT_DOCUMENT_OPTIONS, documentOptions);

  // Create a temporary element in which to calculate / render pages.
  const renderEl = document.createElement('div');

  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  const allPageEls = await Promise.all(
    stacksOption.map(async ({ options: stackOptions = {}, content }) => {
      const { layouts, margin } = merge(DEFAULT_STACK_OPTIONS, stackOptions);

      const pageGroupEl = document.createElement('div');
      renderEl.appendChild(pageGroupEl);

      const templates = layoutsToTemplates(layouts, {
        parent: renderEl,
        size,
        margin,
        styleSheets: styleSheetsOption,
      });

      const pageEls: Array<Element> = [];

      const pager = new Pager({ styleSheets: styleSheetsOption });
      await pager.toPages({
        content: treeToFragment(content),
        onContentChunked: ({ index, setPageVars }) => {
          const layout = getLayoutByIndex(
            templates,
            LAYOUT_START_POSITION,
            index,
          );
          const { width, height } = layout.contentSize;

          setPageVars({
            // PagerJS doesn't like 0 margins so use 0.5in margins temporarily.
            width: `calc(${width} + 1in)`,
            height: `calc(${height} + 1in)`,
            marginTop: '0.5in',
            marginRight: '0.5in',
            marginBottom: '0.5in',
            marginLeft: '0.5in',
          });
        },
        onPageRendered: ({ index, contentElement }) => {
          const content = contentElement.cloneNode(true);
          pageEls.push(
            getLayoutByIndex(templates, LAYOUT_START_POSITION, index).toPage({
              content,
            }),
          );
        },
      });

      return pageEls;
    }),
  );

  renderEl.remove();

  const pagesEl = document.createElement('div');

  allPageEls.flat().forEach((pageEl) => {
    const newPageEl = document.createElement('div');
    const newPageShadow = newPageEl.attachShadow({ mode: 'closed' });
    newPageShadow.appendChild(pageEl);
    pagesEl.append(newPageEl);
  });

  return pagesEl;
};
