import {
  type StackOptions,
  type DocumentOptions,
  type DocumentRoot,
  type DocumentStack,
} from '../../entities/elements.js';
import { type LayoutType } from '../../entities/primitives.js';
import {
  type TreeRoot,
  type TreeElement,
  findElement,
  findElements,
  extractElements,
  getElementOptions,
  treeToRoot,
} from '../../entities/tree.js';
import { mapValues } from 'lodash-es';

// TODO: Replace TreeElements with TreeRoots.

export const treeToDocumentRoot = (root: TreeRoot): DocumentRoot<TreeRoot> => {
  const documentElement = findElement(
    root,
    (element) => element.data.elementType === 'document',
  )!;

  const documentOptions =
    getElementOptions<DocumentOptions<boolean>>(documentElement);

  const stackElements = findElements(
    documentElement,
    (element) => element.data.elementType === 'stack',
  );

  const documentStacks = stackElements.map(
    (stackElement): DocumentStack<TreeRoot> => {
      const [headerElements, footerElements] = ['header', 'footer'].map(
        (elementType) =>
          extractElements(
            stackElement,
            (element) => element.data.elementType === elementType,
          ).reduce(
            (obj, element: TreeElement) => {
              const elementData = getElementOptions<{
                layoutType?: LayoutType;
              }>(element);
              if (!elementData.layoutType) {
                throw new Error(
                  `No layoutType set on React ${elementType} element.`,
                );
              }
              Object.assign(obj, {
                [elementData.layoutType]: treeToRoot(elementType, element),
              });
              return obj;
            },
            {} as Partial<Record<LayoutType, TreeRoot>>,
          ),
      );

      const { layouts: layoutsOption, ...restOptions } =
        getElementOptions<StackOptions<boolean>>(stackElement);

      const options = {
        ...restOptions,
        layouts:
          layoutsOption &&
          mapValues(layoutsOption, (layout, layoutType: LayoutType) => {
            if (!layout) {
              return layout;
            }
            if (layout.header && !headerElements[layoutType]) {
              throw new Error(`${layoutType} header React Element not found.`);
            }
            if (layout.footer && !footerElements[layoutType]) {
              throw new Error(`${layoutType} footer React Element not found.`);
            }
            return {
              header: headerElements[layoutType],
              footer: footerElements[layoutType],
            };
          }),
      };

      return {
        options,
        content: treeToRoot('content', stackElement.children),
      };
    },
  );

  return {
    options: documentOptions,
    stacks: documentStacks,
  };
};
