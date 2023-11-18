import { flatMapNodes, type TreeRoot } from '../../entities/tree.js';
import { TextRun, Paragraph, PageNumber } from 'docx';

type Content = Paragraph;

type Element = Paragraph | TextRun;

// TODO: Create a function that checks Paragraph, TextRun, etc. order by tree appearance.
// Put it in treeToDocumentRoot.

export const treeToDocx = (
  treeRoot: TreeRoot,
  { isContent }: { isContent: boolean },
) => {
  const result = flatMapNodes<Element>(treeRoot, (node, mapChildren) => {
    if (node.type === 'root') {
      return mapChildren(node);
    }
    if (node.type === 'text') {
      return new TextRun({ text: node.value });
    }
    if (node.data.elementType === 'textrun') {
      return new TextRun({ children: mapChildren(node) });
    }
    if (node.data.elementType === 'paragraph' || node.tagName === 'p') {
      return new Paragraph({ children: mapChildren(node) });
    }
    if (node.data.elementType === 'counter') {
      if (isContent) {
        throw new Error('Counters cannot appear in page content.');
      }
      const { counterType } = node.data.options;
      if (counterType === 'page-number') {
        return new TextRun({ children: [PageNumber.CURRENT] });
      }
      if (counterType === 'page-count') {
        return new TextRun({ children: [PageNumber.TOTAL_PAGES] });
      }
      throw new TypeError('Invalid counterType.');
    }
    if (node.tagName === 'b') {
      return new TextRun({ bold: true, children: mapChildren(node) });
    }
    if (node.tagName === 'em') {
      return new TextRun({ italics: true, children: mapChildren(node) });
    }
    return mapChildren(node);
  });

  return result as ReadonlyArray<Content>;
};
