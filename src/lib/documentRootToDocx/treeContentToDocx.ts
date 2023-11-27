import {
  flatMapNodes,
  type TreeRoot,
  type TreeElement,
  isTreeRoot,
  isTreeText,
  isTreeElement,
} from '../../entities/tree.js';
import {
  TextRun,
  Paragraph,
  PageNumber,
  type IRunPropertiesOptions,
  type IParagraphPropertiesOptions,
} from 'docx';

import { transform } from 'lodash-es';

type DocxElement = TextRun | Paragraph;

const parseTextrunOptions = (element: TreeElement) => {
  const {
    data: { options },
  } = element;
  return transform(options, () => {}, {} as IRunPropertiesOptions);
};

const parseParagraphOptions = (element: TreeElement) => {
  const {
    data: { options },
  } = element;
  return transform(options, () => {}, {} as IParagraphPropertiesOptions);
};

export const treeContentToDocx = (
  treeRoot: TreeRoot,
  { isContent }: { isContent: boolean },
) =>
  flatMapNodes<DocxElement, unknown>(treeRoot, {}, ({ node, mapChildren }) => {
    if (isTreeRoot(node)) {
      return mapChildren(node);
    }
    if (isTreeText(node)) {
      return new TextRun(node.value);
    }
    if (!isTreeElement(node)) {
      throw new TypeError('Invalid element');
    }
    const {
      tagName,
      data: { elementType, options },
    } = node;

    if (elementType === 'counter') {
      // TODO: Move to validateTree.
      if (isContent) {
        throw new Error('Counters cannot appear in page content.');
      }
      if (options.counterType === 'page-number') {
        return new TextRun({
          ...parseTextrunOptions(node),
          children: [PageNumber.CURRENT],
        });
      }
      if (options.counterType === 'page-count') {
        return new TextRun({
          ...parseTextrunOptions(node),
          children: [PageNumber.TOTAL_PAGES],
        });
      }
      throw new TypeError('Invalid counter type');
    }

    if (elementType === 'paragraph' || tagName === 'p') {
      return new Paragraph({
        ...parseParagraphOptions(node),
        children: mapChildren(node),
      });
    }

    if (elementType === 'textrun' || tagName === 'b' || tagName === 'em') {
      return new TextRun({
        ...parseTextrunOptions(node),
        children: mapChildren(node),
      });
    }

    if (tagName === 'b') {
      return new TextRun({
        ...parseTextrunOptions(node),
        bold: true,
        children: mapChildren(node),
      });
    }

    if (tagName === 'em') {
      return new TextRun({
        ...parseTextrunOptions(node),
        italics: true,
        children: mapChildren(node),
      });
    }

    return mapChildren(node);
  }) as ReadonlyArray<Paragraph>;
