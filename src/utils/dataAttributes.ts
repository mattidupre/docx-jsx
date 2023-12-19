import type { JsonValue } from 'type-fest';
import { kebabCase, transform, camelCase } from 'lodash-es';

type Attributes = Record<string, unknown>;

type Data = Record<string, JsonValue>;

type Options = {
  prefix?: Lowercase<string>;
};

const createDataPrefix = (options?: Options) => {
  if (!options?.prefix) {
    return 'data-';
  }
  return `data-${options.prefix}`;
};

export const encodeDataAttributeKey = (key: string, options?: Options) => {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) {
    throw new TypeError('Key must be kebab case.');
  }
  const dataKey = createDataPrefix(options) + kebabCase(key);

  return dataKey;
};

export const encodeDataAttributeValue = (value: unknown) => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return encodeURI(String(value));
  }
  return encodeURI(JSON.stringify(value));
};

export const selectByDataAttributes = (
  rootDomElement: Element,
  dataAttributes: Record<string, undefined | string>,
  options?: Options,
) => {
  const query = Object.entries(dataAttributes)
    .map(([key, value]) => {
      return value
        ? `[${encodeDataAttributeKey(key, options)}="${value}"]`
        : '';
    })
    .join('');
  return rootDomElement.querySelectorAll(query);
};

export const encodeDataAttributes = (data: Data, options?: Options) => {
  let attributes: Attributes = {};
  for (const key in data) {
    if (data[key]) {
      attributes[encodeDataAttributeKey(key, options)] =
        encodeDataAttributeValue(data[key]);
    }
  }
  return attributes;
};

export const decodeDataAttributes = (
  attributes: Attributes,
  options?: Options,
) => {
  const dataPrefix = createDataPrefix(options);
  return transform(
    attributes,
    (result, value, key) => {
      if (typeof value !== 'string') {
        return;
      }
      // HAST transforms data-attribute to dataAttribute.
      const kebabKey = kebabCase(key);
      if (!kebabKey.startsWith(dataPrefix)) {
        return;
      }
      let data: JsonValue;
      try {
        data = JSON.parse(decodeURI(value));
      } catch (err) {
        data = value;
      }
      result[camelCase(kebabKey.slice(dataPrefix.length))] = data;
    },
    {} as Data,
  );
};
