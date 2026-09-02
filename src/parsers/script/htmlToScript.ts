import type { HtmlToDomOptions } from '../dom';
import htmlToDomCodeCjs from '../dom?source';

export type HtmlToScriptOptions = Omit<HtmlToDomOptions, 'onDocument'> & {
  targetQuery?: string;
  functionName?: string;
};

/**
 * Serializes a value as a JavaScript literal. `<` is escaped so that the
 * generated script stays safe to embed inside an HTML `<script>` element (see
 * reactToHtmlDocument).
 */
const toScriptLiteral = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export const htmlToScript = (
  html: string,
  { targetQuery = 'body', functionName, ...options }: HtmlToScriptOptions = {},
) => {
  const script = `
    {
      console.log('htmlToScript running...');
      const rootElement = document.querySelector(${toScriptLiteral(
        targetQuery,
      )});
      const html = ${toScriptLiteral(html)};
      const options = ${toScriptLiteral(options)};
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
