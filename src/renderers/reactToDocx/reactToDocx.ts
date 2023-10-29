import { type ReactElement } from 'react';
import { type Node, type Parent } from 'hast';
import { reactToAst } from 'src/renderers/reactToAst';
import { Document, Header, Footer, TextRun, Paragraph } from 'docx';

const renderers = {
  root: ({ children }) => {
    const flatChildren = children.flat();
    if (flatChildren.length !== 1) {
      throw new TypeError('Expected exactly one root element.');
    }
    return flatChildren[0];
  },
  document: ({ children }) => new Document({ sections: children.flat() }),
  pagegroup: ({ children }) => {
    const headers = {};
    const footers = {};
    const sectionChildren = [];

    children.flat().forEach((child) => {
      if (child.elementType === 'header') {
        headers[child.elementData.pageType] = new Header({
          children: child.children,
        });
      } else if (child.elementType === 'footer') {
        footers[child.elementData.pageType] = new Footer({
          children: child.children,
        });
      } else if (child) {
        sectionChildren.push(child);
      }
    });

    return {
      headers: {
        first: headers.first ?? headers.default,
        even: headers.even ?? headers.default,
        default: headers.odd ?? headers.default,
      },
      footers: {
        first: footers.first ?? footers.default,
        even: footers.even ?? footers.default,
        default: footers.odd ?? footers.default,
      },
      children: sectionChildren,
    };
  },
  header: ({ children, ...values }) => ({
    ...values,
    children: children.flat(),
  }),
  footer: ({ children, ...values }) => ({
    ...values,
    children: children.flat(),
  }),
  paragraph: ({ children }) => new Paragraph({ children: children.flat() }),
  text: ({ value }) => new TextRun({ text: value }),
  textrun: ({ children }) => new TextRun({ children: children.flat() }),
  default: (element) => {
    console.log(element);
    return element.children?.flat() ?? [];
  },
};

const mapRecursive = (
  { children, ...rest }: Parent,
  callback: (node: Node) => unknown,
) => {
  return callback({
    ...rest,
    children: children.map((child) => {
      if ('children' in child) {
        return mapRecursive(child, callback);
      } else {
        return callback(child);
      }
    }),
  });
};

export const reactToDocx = async (rootElement: ReactElement) => {
  const ast = await reactToAst(rootElement);

  const docx = mapRecursive(ast, (element) => {
    return (renderers[element.elementType] ?? renderers.default)(element);
  });
  return docx;
};
