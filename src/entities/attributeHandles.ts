import { camelCase, kebabCase } from 'lodash';
import type { CssVarName } from '../utils/css';

/**
 * A minimal, internal mirror of the shape of matti-kit's `defineAttributes`
 * (`@matti-kit/attributes`): an authored schema in, typed handles out. It owns
 * naming and primitive encoding only -- what a name is, how it is referenced,
 * selected and written to an element. What a value means (typography options,
 * fallback arrays, units, the JSON payloads of the element data attributes)
 * stays above it, in the document entities, and never becomes a schema value.
 *
 * Kept deliberately to the subset this library uses so that swapping in the
 * kit package after a move is a mechanical change of imports.
 */

export type DataAttributeName = `data-${string}`;

export type AttributeType = 'css-var' | 'data-attribute';

export type AttributesSchema = Readonly<
  Record<string, { readonly attributeTypes: ReadonlyArray<AttributeType> }>
>;

export type AttributeKeys<
  TSchema extends AttributesSchema,
  TType extends AttributeType,
> = Extract<
  {
    [
      TKey in keyof TSchema
    ]: TType extends TSchema[TKey]['attributeTypes'][number] ? TKey : never;
  }[keyof TSchema],
  string
>;

/** `undefined` skips a key and `false` removes it, as in the kit handle. */
type CssVarValue = undefined | false | string | number;

/** `true` writes an empty attribute, as in the kit handle. */
type DataAttributeValue = undefined | boolean | string;

export type AttributesHandle<TSchema extends AttributesSchema> = {
  readonly prefix: undefined | string;
  /** The css-var keys, in schema order. */
  readonly cssVarKeys: ReadonlyArray<AttributeKeys<TSchema, 'css-var'>>;
  /** The data-attribute keys, in schema order. */
  readonly dataAttributeKeys: ReadonlyArray<
    AttributeKeys<TSchema, 'data-attribute'>
  >;
  /** `--prefix-key` */
  var: (key: AttributeKeys<TSchema, 'css-var'>) => CssVarName;
  /** `data-prefix-key` */
  dataAttribute: (
    key: AttributeKeys<TSchema, 'data-attribute'>,
  ) => DataAttributeName;
  /** `var(--prefix-key)`, or `var(--prefix-key, fallback)` */
  ref: (
    key: AttributeKeys<TSchema, 'css-var'>,
    fallback?: string | number,
  ) => string;
  encodeCssVars: (
    values: Partial<Record<AttributeKeys<TSchema, 'css-var'>, CssVarValue>>,
  ) => Record<CssVarName, string>;
  applyCssVarsToElement: (
    values: Partial<Record<AttributeKeys<TSchema, 'css-var'>, CssVarValue>>,
    element: undefined | null | ElementCSSInlineStyle,
  ) => void;
  encodeDataAttributes: (
    values: Partial<
      Record<AttributeKeys<TSchema, 'data-attribute'>, DataAttributeValue>
    >,
  ) => Record<DataAttributeName, string>;
  /**
   * The raw string value of every schema attribute present in `attributes`,
   * keyed by schema key. Accepts both attribute names (`data-foo-bar`) and the
   * camel cased property names HAST gives them (`dataFooBar`).
   */
  decodeDataAttributes: (
    attributes: Readonly<Record<string, unknown>>,
  ) => Partial<Record<AttributeKeys<TSchema, 'data-attribute'>, string>>;
  /** `[data-prefix-key="value"]…`, with `undefined` values left out. */
  selector: (
    values: Partial<
      Record<AttributeKeys<TSchema, 'data-attribute'>, DataAttributeValue>
    >,
  ) => string;
};

const joinName = (prefix: undefined | string, key: string) =>
  prefix ? `${prefix}-${kebabCase(key)}` : kebabCase(key);

const quoteAttributeValue = (value: string) =>
  `"${value.replace(/["\\]/g, (character) => `\\${character}`)}"`;

/**
 * @example
 * const attrs = defineAttributes('theme', {
 *   fontSize: { attributeTypes: ['css-var'] },
 *   isActive: { attributeTypes: ['data-attribute'] },
 * });
 * attrs.var('fontSize'); // '--theme-font-size'
 * attrs.dataAttribute('isActive'); // 'data-theme-is-active'
 */
export const defineAttributes = <const TSchema extends AttributesSchema>(
  prefix: undefined | string,
  schema: TSchema,
): AttributesHandle<TSchema> => {
  type TCssVarKey = AttributeKeys<TSchema, 'css-var'>;
  type TDataKey = AttributeKeys<TSchema, 'data-attribute'>;

  const schemaKeys: Array<Extract<keyof TSchema, string>> = [];
  for (const key in schema) {
    schemaKeys.push(key);
  }

  const cssVarKeys = schemaKeys.filter((key): key is TCssVarKey =>
    schema[key].attributeTypes.includes('css-var'),
  );

  const dataKeys = schemaKeys.filter((key): key is TDataKey =>
    schema[key].attributeTypes.includes('data-attribute'),
  );

  // The kit handle exposes these names as records by key. Nothing here needs
  // the records, and TypeScript cannot prove one complete without a cast, so
  // the names are looked up through the key lists instead.
  const cssVarName = (key: TCssVarKey): CssVarName => {
    if (!cssVarKeys.includes(key)) {
      throw new TypeError(`"${key}" is not a css-var key of this schema.`);
    }
    return `--${joinName(prefix, key)}`;
  };

  const dataAttributeName = (key: TDataKey): DataAttributeName => {
    if (!dataKeys.includes(key)) {
      throw new TypeError(
        `"${key}" is not a data-attribute key of this schema.`,
      );
    }
    return `data-${joinName(prefix, key)}`;
  };

  const encodeCssVars: AttributesHandle<TSchema>['encodeCssVars'] = (
    values,
  ) => {
    const encoded: Record<CssVarName, string> = {};
    for (const key of cssVarKeys) {
      const value: CssVarValue = values[key];
      if (value !== undefined && value !== false) {
        encoded[cssVarName(key)] = String(value);
      }
    }
    return encoded;
  };

  const encodeDataAttributes: AttributesHandle<TSchema>['encodeDataAttributes'] =
    (values) => {
      const encoded: Record<DataAttributeName, string> = {};
      for (const key of dataKeys) {
        const value: DataAttributeValue = values[key];
        if (value !== undefined && value !== false) {
          encoded[dataAttributeName(key)] = value === true ? '' : value;
        }
      }
      return encoded;
    };

  return {
    prefix,
    cssVarKeys,
    dataAttributeKeys: dataKeys,
    var: cssVarName,
    dataAttribute: dataAttributeName,
    ref: (key, fallback) =>
      `var(${cssVarName(key)}${fallback === undefined ? '' : `, ${fallback}`})`,
    encodeCssVars,
    applyCssVarsToElement: (values, element) => {
      if (!element) {
        return;
      }
      for (const key of cssVarKeys) {
        const value: CssVarValue = values[key];
        if (value === false) {
          element.style.removeProperty(cssVarName(key));
        } else if (value !== undefined) {
          element.style.setProperty(cssVarName(key), String(value));
        }
      }
    },
    encodeDataAttributes,
    decodeDataAttributes: (attributes) => {
      const decoded: Partial<Record<TDataKey, string>> = {};
      for (const key of dataKeys) {
        const name = dataAttributeName(key);
        const value = attributes[name] ?? attributes[camelCase(name)];
        if (typeof value === 'string') {
          decoded[key] = value;
        }
      }
      return decoded;
    },
    selector: (values) =>
      Object.entries(encodeDataAttributes(values))
        .map(([name, value]) => `[${name}=${quoteAttributeValue(value)}]`)
        .join(''),
  };
};

export type ClassNamesHandle<TKey extends string> = {
  readonly prefix: string;
  /** `prefix-key` */
  name: (key: TKey) => string;
  /** `.prefix-key` */
  selector: (key: TKey) => string;
};

/**
 * Class names under one prefix. The kit handle has no class names; this is the
 * same naming rule (`prefix-kebab-key`) applied to them, so that every name
 * the library generates comes from one place.
 */
export const defineClassNames = <TKey extends string = string>(
  prefix: string,
): ClassNamesHandle<TKey> => {
  const name = (key: TKey) => joinName(prefix, key);
  return { prefix, name, selector: (key) => `.${name(key)}` };
};
