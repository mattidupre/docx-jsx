import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const ATTRIBUTES_KEY = ':@';

const TEXT_KEY = '#text';

const DOCUMENT_PATH = 'word/document.xml';

const STYLES_PATH = 'word/styles.xml';

const SETTINGS_PATH = 'word/settings.xml';

const NUMBERING_PATH = 'word/numbering.xml';

const HEADER_PATH_PATTERN = /^word\/header(\d+)\.xml$/;

const FOOTER_PATH_PATTERN = /^word\/footer(\d+)\.xml$/;

export type XmlAttributes = Readonly<Record<string, string>>;

/**
 * `fast-xml-parser` in `preserveOrder` mode emits one object per node: a single
 * tag key holding that node's ordered children, plus an optional `:@` key
 * holding its attributes. Text nodes use the `#text` key and hold a string.
 */
export type XmlNode = Readonly<
  Record<string, undefined | string | XmlAttributes | ReadonlyArray<XmlNode>>
>;

export type XmlNodes = ReadonlyArray<XmlNode>;

const PARSER = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
});

const isXmlNodes = (value: unknown): value is XmlNodes => Array.isArray(value);

const isXmlAttributes = (value: unknown): value is XmlAttributes =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseXml = (xml: string): XmlNodes => {
  const parsed: unknown = PARSER.parse(xml);
  if (!isXmlNodes(parsed)) {
    throw new TypeError('Expected the parsed XML to be a list of nodes.');
  }
  // Drop the `<?xml … ?>` prolog so callers only see real elements.
  return parsed.filter((node) => tagNameOf(node) !== '?xml');
};

export const tagNameOf = (node: XmlNode): string => {
  const tagNames = Object.keys(node).filter((key) => key !== ATTRIBUTES_KEY);
  if (tagNames.length !== 1) {
    throw new TypeError(
      `Expected exactly one tag name, received ${tagNames.length}.`,
    );
  }
  return tagNames[0];
};

export const childrenOf = (node: XmlNode): XmlNodes => {
  const value = node[tagNameOf(node)];
  return isXmlNodes(value) ? value : [];
};

export const attribute = (
  node: XmlNode,
  attributeName: string,
): undefined | string => {
  const attributes = node[ATTRIBUTES_KEY];
  return isXmlAttributes(attributes) ? attributes[attributeName] : undefined;
};

const toNodes = (root: XmlNode | XmlNodes): XmlNodes =>
  isXmlNodes(root) ? root : [root];

/**
 * Depth-first search for every descendant (and the roots themselves) matching
 * `tagName`, e.g. `findAll(document, 'w:tbl')`.
 */
export const findAll = (
  root: XmlNode | XmlNodes,
  tagName: string,
): XmlNodes => {
  const found: Array<XmlNode> = [];
  const visit = (nodes: XmlNodes) => {
    for (const node of nodes) {
      if (tagNameOf(node) === tagName) {
        found.push(node);
      }
      visit(childrenOf(node));
    }
  };
  visit(toNodes(root));
  return found;
};

const textValueOf = (node: XmlNode): string => {
  const value = node[TEXT_KEY];
  return typeof value === 'string' ? value : '';
};

/**
 * The visible text of a node: every `w:t` descendant concatenated in document
 * order. Field instructions (`w:instrText`) are excluded; use
 * {@link fieldCodesOf} for those.
 */
export const textOf = (root: XmlNode | XmlNodes): string =>
  findAll(root, 'w:t')
    .flatMap((textNode) => childrenOf(textNode).map(textValueOf))
    .join('');

/**
 * The field instructions of a node, e.g. `['PAGE', 'NUMPAGES']` for a running
 * header showing "Page N of M".
 */
export const fieldCodesOf = (root: XmlNode | XmlNodes): ReadonlyArray<string> =>
  findAll(root, 'w:instrText').map((instructionNode) =>
    childrenOf(instructionNode).map(textValueOf).join(''),
  );

export const paragraphs = (root: XmlNode | XmlNodes): XmlNodes =>
  findAll(root, 'w:p');

export const tables = (root: XmlNode | XmlNodes): XmlNodes =>
  findAll(root, 'w:tbl');

export const sections = (root: XmlNode | XmlNodes): XmlNodes =>
  findAll(root, 'w:sectPr');

export const styleIds = (
  stylesRoot: XmlNode | XmlNodes,
): ReadonlyArray<string> =>
  findAll(stylesRoot, 'w:style').flatMap((styleNode) => {
    const styleId = attribute(styleNode, 'w:styleId');
    return styleId === undefined ? [] : [styleId];
  });

export type DocxArchive = {
  readonly fileNames: ReadonlyArray<string>;
  readonly document: XmlNodes;
  readonly styles: XmlNodes;
  readonly settings: XmlNodes;
  readonly numbering: undefined | XmlNodes;
  readonly headers: ReadonlyArray<XmlNodes>;
  readonly footers: ReadonlyArray<XmlNodes>;
};

const readPart = async (
  zip: JSZip,
  path: string,
): Promise<undefined | XmlNodes> => {
  const file = zip.file(path);
  return file ? parseXml(await file.async('string')) : undefined;
};

const readRequiredPart = async (
  zip: JSZip,
  path: string,
): Promise<XmlNodes> => {
  const part = await readPart(zip, path);
  if (!part) {
    throw new TypeError(`Expected the DOCX archive to contain ${path}.`);
  }
  return part;
};

const readPartsByIndex = async (
  zip: JSZip,
  fileNames: ReadonlyArray<string>,
  pattern: RegExp,
): Promise<ReadonlyArray<XmlNodes>> => {
  const matched = fileNames
    .flatMap((fileName) => {
      const match = pattern.exec(fileName);
      return match ? [{ fileName, index: Number(match[1]) }] : [];
    })
    .sort((a, b) => a.index - b.index);
  return Promise.all(
    matched.map(({ fileName }) => readRequiredPart(zip, fileName)),
  );
};

/**
 * Unzip a DOCX buffer and parse the parts tests assert against.
 */
export const inspectDocx = async (
  content: Uint8Array,
): Promise<DocxArchive> => {
  const zip = await JSZip.loadAsync(content);
  const fileNames = Object.keys(zip.files).sort();

  return {
    fileNames,
    document: await readRequiredPart(zip, DOCUMENT_PATH),
    styles: await readRequiredPart(zip, STYLES_PATH),
    settings: await readRequiredPart(zip, SETTINGS_PATH),
    numbering: await readPart(zip, NUMBERING_PATH),
    headers: await readPartsByIndex(zip, fileNames, HEADER_PATH_PATTERN),
    footers: await readPartsByIndex(zip, fileNames, FOOTER_PATH_PATTERN),
  };
};
