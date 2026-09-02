import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';
import { htmlToScript } from './parsers/script';

/**
 * A standalone HTML file that paginates itself in the browser.
 *
 * The markup appears twice: once inside the inlined script, which is the copy
 * `htmlToDom` parses, and once in the hidden `#raw` container. The container is
 * kept deliberately — it is the only way to read the `data-matti-docs*`
 * annotations of a rendered document in devtools or in a diff, and the tests
 * assert the pipeline's front half against it. Its cost is that the document
 * carries the markup twice; removing that duplication means teaching
 * `htmlToScript` to read the markup out of `#raw` instead of embedding a second
 * copy of it.
 *
 * The copy also repeats every `id` a `Bookmark` declared, so `#raw` has to stay
 * *after* `#rendered`: pages are rendered in the light DOM and an anchor is
 * resolved to the first element in tree order carrying the id, which has to be
 * the rendered one for an internal link to land on the right page.
 */
export const reactToHtmlDocument = async (
  DocumentRoot: DocumentRootComponent,
) => {
  const html = reactToHtml(DocumentRoot, 'pdf');
  const script = htmlToScript(html, {
    pageClassName: 'page',
    targetQuery: '#rendered',
  });
  return `
<!doctype html>
<html>
<head>
  <style>
    .page {
      position: relative;
      margin-left: auto;
      margin-right: auto;
      box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
<div id="rendered"></div>
<div id="raw" style="display: none;">${html}</div>
<script>
${script}
</script>
</body>
</html>
  `;
};
