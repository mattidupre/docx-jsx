import { Previewer } from 'pagedjs';
import { type DocumentOptions } from 'src/entities';
import { registerPageHandler } from './registerPageHandler';
import { createRenderer } from './createPageRenderer';
import { addStyleSheet } from 'src/utils';

const previewer = new Previewer();

export const createPager = async (
  rootElement: HTMLElement,
  documentOptions: DocumentOptions,
) => {
  const { documentHtml, documentCss, pageHandler } =
    createRenderer(documentOptions);

  addStyleSheet(documentCss);

  // TODO: Make sure no two renders are occurring simultaneously.

  const unregister = registerPageHandler(pageHandler);

  const startTime = performance.now();

  await previewer.preview(documentHtml, [{ _: documentCss }], rootElement);

  console.log(
    `Pages created in ${Math.round(performance.now() - startTime)}ms.`,
  );

  unregister();
};
