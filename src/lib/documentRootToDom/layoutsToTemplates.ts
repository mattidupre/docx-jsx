import {
  type Size,
  type PageMargin,
  type LayoutsPartial,
  LAYOUT_TYPES_MERGED,
  mergeLayouts,
  type LayoutTypeMerged,
} from 'src/entities/primitives';
import { type TreeRoot, treeToFragment } from 'src/entities/tree';
import { PageTemplate } from './pageTemplate';

type Templates = Record<LayoutTypeMerged, PageTemplate>;

type Options = {
  size: Size;
  margin: PageMargin;
  styleSheets: Array<CSSStyleSheet>;
  parent: HTMLElement;
};

export const layoutsToTemplates = (
  layouts: undefined | LayoutsPartial<TreeRoot>,
  { styleSheets, size, margin, parent }: Options,
): Templates => {
  const mergedLayouts = mergeLayouts([layouts]);
  const templates = {} as Templates;
  for (const layoutType of LAYOUT_TYPES_MERGED) {
    const { header, footer } = mergedLayouts[layoutType];
    const template = new PageTemplate({
      layoutType,
      size,
      margin,
      header: treeToFragment(header),
      footer: treeToFragment(footer),
      styleSheets,
    });

    parent.appendChild(template.element);
    template.getContentSize();
    parent.removeChild(template.element);
    templates[layoutType] = template;
  }
  return templates;
};

// export const getLayoutByPageNumber = <TLayout>(
//   layouts: Record<LayoutTypeMerged, TLayout>,
//   pageNumber: number,
// ): TLayout => {
//   if (pageNumber === 0) {
//     return layouts.first;
//   }
//   if (pageNumber % 2 === 0) {
//     return layouts.left;
//   }
//   if (pageNumber % 2 === 1) {
//     return layouts.right;
//   }
//   throw new Error('Invalid index.');
// };
