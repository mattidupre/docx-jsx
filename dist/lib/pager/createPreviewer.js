import { Previewer } from 'pagedjs';
import { registerPageHandler } from './registerPageHandler';
import { createRenderer } from './createPageRenderer';
import { addStyleSheet } from 'src/utils';
const previewer = new Previewer();
export const createPreviewer = async (rootElement, documentOptions) => {
    const { documentHtml, documentCss, pageHandler } = createRenderer(documentOptions);
    addStyleSheet(documentCss);
    // TODO: Make sure no two renders are occurring simultaneously.
    const unregister = registerPageHandler(pageHandler);
    await previewer.preview(documentHtml, [{ _: documentCss }], rootElement);
    unregister();
};
//# sourceMappingURL=createPreviewer.js.map