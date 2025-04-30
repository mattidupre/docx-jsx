import type { HtmlToDomOptions } from '../dom';
import htmlToDomCodeCjs from '../dom?source';

export type HtmlToScriptOptions = Omit<HtmlToDomOptions, 'onDocument'> & {
  targetQuery?: string;
  functionName?: string;
};

export const htmlToScript = (
  html: string,
  { targetQuery = 'body', functionName, ...options }: HtmlToScriptOptions = {},
) => {
  const script = `
    {
      console.log('htmlToScript running...');
      const rootElement = document.querySelector(\`${targetQuery}\`);
      const html = \`${html}\`;
      const options = ${JSON.stringify(options)};
      let result;
      options.onDocument = (documentObject) => {
        result = documentObject;
      };
      const exports = {};
      {
        ${htmlToDomCodeCjs};
      }
      try {
        return exports.htmlToDom(html, options).then((element) => {
          rootElement.appendChild(element);
          return result;
        });
      } catch(err) {
        console.log('Error in htmlToScript', {err});
        return ''; 
      }
    }
  `;
  return functionName ? `${functionName}() ${script};` : `(() => ${script})();`;
};
