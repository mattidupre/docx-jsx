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
      return exports.htmlToDom(html, options).then((element) => {
        rootElement.appendChild(element);
        return result;
      });
    }
  `;
  return functionName ? `${functionName}() ${script};` : `(() => ${script})();`;
};
