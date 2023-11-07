import { type ReactElement } from 'react';
import { type ReactAst } from 'src/entities';
import { reactToAst } from 'src/renderers/reactToAst';
import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  type ISectionOptions,
} from 'docx';

const renderers = {
  root: ({ children }: { children: ReadonlyArray<Document> }) => {
    const flatChildren = children.flat();
    if (flatChildren.length !== 1) {
      throw new TypeError('Expected exactly one root element.');
    }
    return flatChildren[0];
  },
  document: ({ children }: { children: ReadonlyArray<ISectionOptions> }) =>
    new Document({ sections: children }),
  pagegroup: ({
    children,
  }: {
    children: ReadonlyArray<Paragraph | TextRun>;
  }) => {
    const headers: Record<string, Header> = {};
    const footers: Record<string, Footer> = {};
    const sectionChildren: ISectionOptions[] = [];

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
  header: ({ children, ...values }) => {
    return {
      ...values,
      children: children.flat(),
    };
  },
  footer: ({ children, ...values }) => ({
    ...values,
    children: children.flat(),
  }),
  paragraph: ({ children }) => new Paragraph({ children: children.flat() }),
  text: ({ value }) => new TextRun({ text: value }),
  textrun: ({ children }) => new TextRun({ children: children.flat() }),
  default: (element) => {
    return element.children?.flat() ?? [];
  },
};

const mapRecursive = (
  { children, ...rest }: ReactAst,
  callback: (node: ReactAst) => unknown,
): unknown =>
  callback({
    ...rest,
    ...(children
      ? { children: children.flatMap((child) => mapRecursive(child, callback)) }
      : {}),
  } as ReactAst);

export const reactToDocx = async (rootElement: ReactElement) => {
  const ast = await reactToAst(rootElement);

  const docx = mapRecursive(ast, (element) => {
    return (renderers[element.elementType] ?? renderers.default)(element);
  });
  return docx;
};
