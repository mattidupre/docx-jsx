import { flattenNode, Store } from 'src/lib/render';
import {
  type AnyNode,
  isIntrinsicElement,
  type IntrinsicElement,
} from 'src/entities/node';
import { Schema, type SchemaPropsObj } from './_schemaConfig';

type SchemaName = keyof SchemaPropsObj;

export type SchemaProps<TName extends SchemaName = SchemaName> =
  SchemaPropsObj[TName];

type ParseOptions = {
  types: ReadonlyArray<SchemaName>;
  allowEmpty?: boolean;
};

const parseElements = <
  TOptions extends ParseOptions,
  TIsReturnArray extends boolean,
>(
  children: ReadonlyArray<IntrinsicElement>,
  { types, allowEmpty }: TOptions,
  returnArray: TIsReturnArray,
): TIsReturnArray extends true
  ? ReadonlyArray<IntrinsicElement<TOptions['types']>>
  :
      | (TOptions['allowEmpty'] extends true ? undefined : never)
      | IntrinsicElement<TOptions['types']> => {
  children.forEach((child) => {
    if (!isIntrinsicElement(child, types)) {
      throw new Error(
        `Invalid intrinsic element ${
          (child as any)?.type ?? child
        }, expected ${types.join(' or ')}.`,
      );
    }
  });

  if (allowEmpty === true && children.length === 0) {
    throw new Error('Expected at least one child.');
  }

  if (returnArray !== true) {
    if (children.length > 1) {
      throw new Error('Expected no more than one child.');
    }
    return children[0] as any;
  }

  return children as any;
};

export type SchemaContext = {
  parseChildren: <TOptions extends ParseOptions>(
    node: AnyNode,
    options: TOptions,
  ) => ReturnType<typeof parseElements<TOptions, true>>;
  parseChild: <TOptions extends ParseOptions>(
    node: AnyNode,
    options: TOptions,
  ) => ReturnType<typeof parseElements<TOptions, false>>;
};

export const render = (
  rootNode: AnyNode,
  target: undefined | 'docx' | 'ast',
) => {
  const parseElement = (
    { type, props }: IntrinsicElement,
    context: SchemaContext,
  ) => {
    const { parseProps, renderDocx } = Schema[type];
    const options = parseProps(props, context);
    if (target === 'docx') {
      return renderDocx(options);
    }
    if (target === 'ast') {
      return { type, options };
    }
    return options;
  };

  const context: SchemaContext = {
    parseChildren: (node, options) =>
      parseElements(flattenNode(node), options, true).map((element) =>
        parseElement(element, context),
      ),
    parseChild: (node, options) => {
      const element = parseElements(flattenNode(node), options, false);
      return element === undefined ? undefined : parseElement(element, context);
    },
  };

  try {
    Store.initGlobal();
    const result = context.parseChild(rootNode, {
      types: ['document'],
      allowEmpty: false,
    });

    return result;
  } finally {
    Store.completeGlobal();
  }
};
