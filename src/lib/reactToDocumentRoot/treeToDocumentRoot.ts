import {
  type StackOptions,
  type DocumentOptions,
  type DocumentRoot,
  type DocumentStack,
} from 'src/entities/elements';
import { cloneDeep } from 'lodash';
import {
  LAYOUT_TYPES,
  type Layout,
  type LayoutType,
} from 'src/entities/primitives';
import {
  type TreeRoot,
  type TreeElement,
  findElement,
  findElements,
  extractElements,
  getElementOptions,
  treeToRoot,
} from 'src/entities/tree';

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
      const { layouts = {}, ...restStackOptions } =
        getElementOptions<StackOptions<boolean>>(stackElement);

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
                [elementData.layoutType]: treeToRoot(element),
              });
              return obj;
            },
            {} as Partial<Record<LayoutType, TreeRoot>>,
          ),
      );

      const layoutsWithElements: DocumentStack<TreeRoot>['options']['layouts'] =
        {};
      LAYOUT_TYPES.forEach((layoutType) => {
        if (layouts[layoutType]) {
          const { header, footer, ...restLayout } = layouts[layoutType]!;
          const newLayout = cloneDeep(restLayout) as Layout<TreeRoot>;
          newLayout.header =
            header === false ? false : headerElements[layoutType]!;
          newLayout.footer =
            header === false ? false : footerElements[layoutType]!;
          layoutsWithElements[layoutType] = newLayout;
        }
      });

      return {
        options: { ...restStackOptions, layouts: layoutsWithElements },
        content: treeToRoot(stackElement.children),
      };
    },
  );

  return {
    options: documentOptions,
    stacks: documentStacks,
  };
};
