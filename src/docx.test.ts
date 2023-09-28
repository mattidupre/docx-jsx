import { mockDocumentElement } from 'src/helpers/mockDocument';
import { renderDocument, isIntrinsicElement } from 'src/lib/renderer';
import { test } from 'vitest';
import { asDocXInstance } from 'src/lib/docX';
import { createElement } from 'react';
import { TextRun } from 'src/lib/components';
import { asArray } from 'src/utils';
import { Packer } from 'docx';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';
import { useTextRunOptions } from 'src/lib/context';

const MOCK_ENVIRONMENT = 'test';

const dirname = fileURLToPath(new URL('.', import.meta.url));

test('todo', async () => {
  const documentOptions = renderDocument(
    MOCK_ENVIRONMENT,
    mockDocumentElement,
    ({ element, render }) => {
      if (isIntrinsicElement(element, 'primitive')) {
        return asArray(element.props.children).map((text) =>
          asDocXInstance('textrun', {
            ...useTextRunOptions(),
            text,
          }),
        );
      }

      const {
        type,
        props: { children: childrenProp, ...options },
      } = element;

      const children = asArray(childrenProp).flatMap((child) => {
        // if (!isIntrinsicElement(child)) {
        //   return child;
        // }
        return render(child);
      });

      // HERE: Why is a spy slipping through?

      console.log(children);

      return asDocXInstance(type, {
        children,
        ...options,
      });
    },
  );

  // console.log(documentOptions.sections[0].children);

  const document = asDocXInstance('document', {
    sections: [{ children: documentOptions.sections[0].children }],
  });

  const buffer = await Packer.toBuffer(document);

  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);
});
