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
  return `data-${options.prefix}-`;
};

export const encodeDataAttributes = (data: Data, options?: Options) => {
  const dataPrefix = createDataPrefix(options);
  let attributes: Attributes = {};
  for (const key in data) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) {
      throw new TypeError('Key must be kebab case.');
    }
    attributes[createDataPrefix(options) + kebabCase(key)] = encodeURI(
      JSON.stringify(data[key]),
    );
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
