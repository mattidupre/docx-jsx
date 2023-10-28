import type { ElementType } from './schema';

export const ID_PREFIX: Lowercase<string> = 'docx-jsx';

export const HTML_TYPE_ATTRIBUTE = `data-${ID_PREFIX}-type`;
export const HTML_DATA_ATTRIBUTE = `data-${ID_PREFIX}-data`;

export const encodeHtmlDataAttributes = (
  data: Record<string, any> & { elementType: ElementType },
) => ({
  [HTML_TYPE_ATTRIBUTE]: data.elementType,
  [HTML_DATA_ATTRIBUTE]: encodeURI(JSON.stringify(data)),
});

const AST_DATA_ATTRIBUTE = HTML_DATA_ATTRIBUTE.replace(
  /\-[a-z]/g,
  (char) => `${char[1].toUpperCase()}`,
);
export const decodeAstDataAttributes = (elAttributes: any) =>
  elAttributes?.[AST_DATA_ATTRIBUTE] &&
  JSON.parse(decodeURI(elAttributes[AST_DATA_ATTRIBUTE]));
