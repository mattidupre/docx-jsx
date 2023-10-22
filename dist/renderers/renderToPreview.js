import { createRenderer } from 'src/lib/renderer';
import { parseOptionsToHtml } from 'src/lib/parse';
const renderToHtml = createRenderer(parseOptionsToHtml);
export const renderToPreview = (documentNode) => {
    const { pagesGroups } = renderToHtml(documentNode);
    console.log(pagesGroups);
    // createPager is called here.
};
//# sourceMappingURL=renderToPreview.js.map