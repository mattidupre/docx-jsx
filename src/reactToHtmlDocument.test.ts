import { camelCase } from 'lodash';
import { beforeAll, describe, expect, it } from 'vitest';
import { reactToHtmlDocument } from './reactToHtmlDocument';
import { MOCK_BOOKMARK_ID, MockDocument } from './fixtures/mockDocument';
import { MOCK_IMAGE_DATA_URL } from './fixtures/mockImage';
import { writeTestFile } from './fixtures/writeTestFile';
import { mapHtml } from './utils/mapHtml/mapHtml';
import { encodeDataAttributeKey } from './utils/dataAttributes';
import { DEFAULT_PREFIX } from './entities/options';

const RAW_CONTAINER_OPEN = '<div id="raw" style="display: none;">';

const dataAttributeName = (key: string) =>
  encodeDataAttributeKey(key, { prefix: DEFAULT_PREFIX });

const ELEMENT_TYPE_ATTRIBUTE = dataAttributeName('elementType');

const ELEMENT_OPTIONS_ATTRIBUTE = dataAttributeName('elementOptions');

const CONTENT_OPTIONS_ATTRIBUTE = dataAttributeName('contentOptions');

// HAST transforms data-attribute to dataAttribute.
const ELEMENT_TYPE_PROPERTY = camelCase(ELEMENT_TYPE_ATTRIBUTE);

type OutlineContext = { readonly depth: number };

/**
 * An indented `tagName [elementType]` outline of the server-rendered markup,
 * used as the stability baseline for the front half of the pipeline.
 */
const elementOutline = (html: string): string => {
  const lines: Array<string> = [];
  mapHtml<OutlineContext, null>(html, {
    onElementBeforeChildren: ({
      htmlElement: { tagName, properties },
      parentContext,
    }) => {
      const depth = parentContext ? parentContext.depth + 1 : 0;
      const elementType = properties[ELEMENT_TYPE_PROPERTY];
      lines.push(
        `${'  '.repeat(depth)}${tagName}${elementType ? ` [${elementType}]` : ''}`,
      );
      return { depth };
    },
    onText: () => null,
    onElementAfterChildren: () => null,
  });
  return lines.join('\n');
};

const rawMarkupOf = (htmlDocument: string): string => {
  const start = htmlDocument.indexOf(RAW_CONTAINER_OPEN);
  const end = htmlDocument.indexOf('<script>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return htmlDocument.slice(start + RAW_CONTAINER_OPEN.length, end);
};

describe('reactToHtmlDocument', () => {
  let htmlDocument: string;

  beforeAll(async () => {
    htmlDocument = await reactToHtmlDocument(MockDocument);
    await writeTestFile('reactToHtmlDocument.html', htmlDocument);
  });

  it('renders a complete html document', () => {
    expect(htmlDocument.trimStart().startsWith('<!doctype html>')).toBe(true);
    expect(htmlDocument).toContain('<div id="rendered"></div>');
    expect(htmlDocument).toContain(RAW_CONTAINER_OPEN);
    expect(htmlDocument.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('inlines the paging script that targets #rendered', () => {
    const scriptStart = htmlDocument.indexOf('<script>');
    const scriptEnd = htmlDocument.indexOf('</script>');
    expect(scriptEnd).toBeGreaterThan(scriptStart);
    const script = htmlDocument.slice(scriptStart, scriptEnd);
    expect(script).toMatch(
      /document\.querySelector\(\s*['"`]#rendered['"`]\s*\)/,
    );
    expect(script).toContain('exports.htmlToDom');
    expect(script).toContain('pageClassName');
  });

  it('embeds the encoded element data in the raw markup', () => {
    const rawMarkup = rawMarkupOf(htmlDocument);
    // The document element also carries its element class, so the attribute is
    // not necessarily the first one on the opening tag.
    expect(rawMarkup.startsWith('<div ')).toBe(true);
    expect(rawMarkup).toContain(`${ELEMENT_TYPE_ATTRIBUTE}="document"`);
    for (const elementType of ['stack', 'header', 'content', 'footer']) {
      expect(rawMarkup).toContain(`${ELEMENT_TYPE_ATTRIBUTE}="${elementType}"`);
    }
    expect(rawMarkup).toContain(`${ELEMENT_TYPE_ATTRIBUTE}="pagenumber"`);
    expect(rawMarkup).toContain(`${ELEMENT_TYPE_ATTRIBUTE}="pagecount"`);
    for (const elementType of ['image', 'divider', 'spacer', 'list']) {
      expect(rawMarkup).toContain(`${ELEMENT_TYPE_ATTRIBUTE}="${elementType}"`);
    }
    expect(rawMarkup).toContain(`${CONTENT_OPTIONS_ATTRIBUTE}=`);

    const documentOptions = new RegExp(
      `${ELEMENT_OPTIONS_ATTRIBUTE}="([^"]*)"`,
    ).exec(rawMarkup);
    expect(documentOptions).not.toBeNull();
    expect(JSON.parse(decodeURI(documentOptions?.[1] ?? ''))).toMatchObject({
      size: { width: '8.5in', height: '11in' },
      prefixes: {
        elementClassName: 'matti-docs-element',
        variantClassName: 'matti-docs-variant',
        cssVariable: 'matti-docs',
      },
    });
  });

  it('inlines the image and keeps the bookmark ahead of the raw copy of it', () => {
    const rawMarkup = rawMarkupOf(htmlDocument);
    expect(rawMarkup).toContain(`src="${MOCK_IMAGE_DATA_URL}"`);
    expect(rawMarkup).toContain(`id="${MOCK_BOOKMARK_ID}"`);
    expect(rawMarkup).toContain(`href="#${MOCK_BOOKMARK_ID}"`);

    // Pages are rendered into `#rendered` in the light DOM and an anchor
    // resolves to the first element in tree order carrying the id, so the
    // hidden copy of the markup has to stay after it.
    expect(htmlDocument.indexOf('<div id="rendered">')).toBeLessThan(
      htmlDocument.indexOf(RAW_CONTAINER_OPEN),
    );
  });

  it('is deterministic across renders', async () => {
    expect(await reactToHtmlDocument(MockDocument)).toBe(htmlDocument);
  });

  it('matches the rendered element outline', () => {
    expect(elementOutline(rawMarkupOf(htmlDocument))).toMatchSnapshot();
  });
});
