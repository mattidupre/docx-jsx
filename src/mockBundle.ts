import { mockDoc } from './mocks/mockDoc';
import { reactToHtmlObj } from './reactToHtmlObj';
import { htmlObjToHtml } from './htmlObjToHtml';

document.addEventListener('DOMContentLoaded', async () => {
  const htmlObj = await reactToHtmlObj(mockDoc);
  const rootEl = document.createElement('div');
  document.body.appendChild(rootEl);
  const html = await htmlObjToHtml(rootEl, htmlObj);

  // console.log(await reactToHtmlObj(mockDoc));
});
