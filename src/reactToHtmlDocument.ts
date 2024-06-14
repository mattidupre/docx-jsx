import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';
import { htmlToScript } from './parsers/script';

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
