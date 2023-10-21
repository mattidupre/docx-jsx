import { createRenderer } from 'src/lib/renderer';
import { createParser } from 'src/lib/parser';
import { createPager } from 'src/lib/pager';
import { type ChildNode } from 'src/entities';

const renderToHtml = createRenderer('document', createParser('html'));

export const renderToPreview = (documentNode: ChildNode) => {
  const { pagesGroups } = renderToHtml(documentNode);
  // createPager is called here.
};

// const temp = () => {
//   const createPage = () => {
//     const pageEl = document.createElement('div');
//     pageEl.classList.add('pages_group__page');
//     return pageEl;
//   };

//   Array.from(document.querySelectorAll('.pages_group')).forEach((pagesEl) => {
//     const headers = pagesEl.querySelectorAll('.pages_group__header');
//     const content = pagesEl.querySelectorAll('.pages_group__content');
//     const footers = pagesEl.querySelectorAll('.pages_group__footer');
//     pagesEl.appendChild(createPage());
//   });
// };

// const renderPageGroup = ({ headers, html, footers }) => {
//   const headerHtml = Object.entries(headers)
//     .map(
//       ([headerType, { html: thisHtml }]) =>
//         `<div class="pages_group__header pages_group__header--${headerType}">${thisHtml}</div>`,
//     )
//     .join('\n');
//   const contentHtml = `<main class="pages_group__content">${html}</main>`;
//   const footerHtml = Object.entries(footers)
//     .map(
//       ([headerType, { html: thisHtml }]) =>
//         `<div class="pages_group__footer pages_group__footer--${headerType}">${thisHtml}</div>`,
//     )
//     .join('\n');
//   return `<article class="pages_group">${[
//     headerHtml,
//     contentHtml,
//     footerHtml,
//   ].join('\n')}</article>`;
// };

// const renderHtml = (content) => {
//   return `<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n${content}\n</body>\n</html>`;
// };

// const renderScript = () =>
//   `<script>\ndocument.addEventListener("DOMContentLoaded", ${temp.toString()});\n</script>`;

// export const renderToPreview = (documentNode: ChildNode) => {
//   const { pagesGroups } = renderToHtml(documentNode);
//   return renderHtml(
//     [pagesGroups.map(renderPageGroup).join(''), renderScript()].join('\n'),
//   );
// };
