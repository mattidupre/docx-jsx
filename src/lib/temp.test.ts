import { test } from 'vitest';
import { mapHtmlElements } from '../entities/elements';
import { mockDocumentHtml } from '../fixtures/mockDocument';

test('TEMP', () => {
  const document = mapHtmlElements<any>(
    `<div><div>${mockDocumentHtml}</div></div>`,
    {
      onText: ({ value }) => {
        return value;
      },
      onElement: ({ elementType, context, tagName, children }) => {
        if (elementType === 'stack') {
          const {
            layouts,
            options: { margin },
          } = context;
          return {
            elementType,
            layouts,
            margin,
          };
        }
        if (elementType === 'document') {
          const {
            options: { pageSize },
          } = context;
          return {
            elementType,
            pageSize,
            children,
          };
        }

        return `<${tagName}>${(children ?? []).join('')}</${tagName}>`;
      },
    },
  );

  console.log(JSON.stringify(document, undefined, 2));
});
