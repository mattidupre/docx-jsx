import { type ParserContext } from 'src/lib/render';
import { asArrayOf, asFlatOf, mapObjectValues } from 'src/utils';
import {
  type IDocumentOptions,
  type ISectionOptions,
  type IParagraphOptions,
} from 'docx';

const isIntrinsicType = <TType extends string>(
  value: any,
  type: TType,
): value is { type: TType } => 'type' in value && value.type === type;

type PropsParser<
  TProps extends Record<string, any>,
  TOptions extends Record<string, any>,
> = (context: ParserContext<PropsParser<TProps, TOptions>>) => TOptions;

const defineIntrinsic = <
  TType extends string,
  TProps extends Record<string, any>,
  TOptions extends Record<string, any>,
>(
  type: TType,
  propsToOptions: PropsParser<TProps, TOptions>,
) =>
  [
    type,
    {
      type,
      propsToOptions,
    },
  ] as const;

type DefineChild = any; // TODO: Use to get types from links.
type DefineChildren = any; // TODO: Use to get types from links.

const INTRINSIC_DEFINITIONS = [
  defineIntrinsic('text', ({ text }: { text: string }) => {
    return { text };
  }),

  defineIntrinsic(
    'document',
    (
      {
        children,
        ...options
      }: Omit<IDocumentOptions, 'sections'> & { children: DefineChildren },
      { render },
    ) => {
      const sections = asArrayOf(render(children), {
        min: 0,
        undefinable: false,
      }) as unknown as ReadonlyArray<ISectionOptions>;
      return { ...options, sections };
    },
  ),

  defineIntrinsic(
    'section',
    (
      {
        children,
        headers,
        footers,
      }: Omit<ISectionOptions, 'children' | 'header' | 'footer'> & {
        children: DefineChildren;
        headers?: Partial<
          Record<keyof ISectionOptions['headers'], DefineChild>
        >;
        footers?: Partial<
          Record<keyof ISectionOptions['footers'], DefineChild>
        >;
      },
      { render },
    ) => {
      return {
        children: render(children),
        headers: headers
          ? mapObjectValues(headers, (_, header) => {
              const result = asFlatOf(render(header), { undefinable: true });
              if (result === undefined) {
                return undefined;
              }
              if (!isIntrinsicType(result, 'header')) {
                throw new Error('Expected a Header element.');
              }
              return result;
            })
          : undefined,
        footers: footers
          ? mapObjectValues(footers, (_, footer) => {
              const result = asFlatOf(render(footer), { undefinable: true });
              if (result === undefined) {
                return undefined;
              }
              if (!isIntrinsicType(result, 'footer')) {
                throw new Error('Expected a Footer element.');
              }
              return result;
            })
          : undefined,
      };
    },
  ),

  defineIntrinsic(
    'header',
    ({ children }: { children: DefineChildren }, { render }) => {
      return { children: render(children) };
    },
  ),

  defineIntrinsic(
    'footer',
    ({ children }: { children: DefineChildren }, { render }) => {
      return { children: render(children) };
    },
  ),

  defineIntrinsic(
    'paragraph',
    (
      {
        children,
        ...options
      }: Omit<IParagraphOptions, 'children'> & { children: DefineChildren },
      { render },
    ) => {
      return { children: render(children), ...options };
    },
  ),

  defineIntrinsic(
    'textrun',
    (
      {
        children,
        ...options
      }: Omit<IParagraphOptions, 'children'> & { children: DefineChildren },
      { render },
    ) => {
      return { children: render(children), ...options };
    },
  ),
] as const;

const intrinsicsConfig = Object.fromEntries(INTRINSIC_DEFINITIONS) as {
  [I in (typeof INTRINSIC_DEFINITIONS)[number][1] as I['type']]: I;
};

type IntrinsicsConfig = typeof intrinsicsConfig;

export type IntrinsicPropsConfig = {
  [K in keyof IntrinsicsConfig]: Parameters<
    IntrinsicsConfig[K]['propsToOptions']
  >[0] extends ParserContext<infer TParser extends PropsParser<any, any>>
    ? TParser extends PropsParser<infer TProps, any>
      ? TProps
      : never
    : never;
};

export const intrinsicParents = mapObjectValues(
  intrinsicsConfig,
  (...[, value]) => value.parentTypes,
) as {
  [K in keyof IntrinsicsConfig]: IntrinsicsConfig[K]['parentTypes'][number];
};
