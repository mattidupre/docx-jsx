import type { JsonValue } from 'type-fest';

export type DataAttributes = Record<`data-${string}`, string>;

/**
 * A data attribute payload: strings, numbers and booleans as themselves,
 * anything else as JSON, all of it through `encodeURI` so the value survives
 * any HTML serializer untouched.
 */
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

/**
 * The inverse of {@link encodeDataAttributeValue}. A payload that is not JSON
 * (a bare string such as an element type) is returned as it was written.
 */
export const decodeDataAttributeValue = (value: string): JsonValue => {
  try {
    return JSON.parse(decodeURI(value));
  } catch {
    return value;
  }
};

export const applyDataAttributes = (
  element: Element,
  attributes: undefined | DataAttributes,
) => {
  if (!attributes) {
    return;
  }
  for (const key in attributes) {
    if (!key.startsWith('data-')) {
      throw new TypeError('Key must start with data-');
    }
    element.setAttribute(key, attributes[key as keyof typeof attributes]);
  }
};
