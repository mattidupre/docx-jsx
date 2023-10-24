import { Type, Kind, TypeRegistry } from '@sinclair/typebox';
import { type ReactNode } from 'react';

TypeRegistry.Set<any>('Node', () => true);

export type NodeTypeOptions<
  TNodeType extends 'child' | 'children' = 'child' | 'children',
  TElementType extends string = string,
  TRequired extends undefined | boolean = undefined | boolean,
> = {
  nodeType: TNodeType;
  elementTypes: ReadonlyArray<TElementType>;
  required: TRequired;
};

export type Encoder = ({
  node,
  elementDefinition,
}: {
  node: ReactNode;
  elementDefinition: NodeTypeOptions;
}) => any;

export const NodeType =
  <TNodeType extends NodeTypeOptions['nodeType'], TEncoder extends Encoder>({
    nodeType,
    encoder,
  }: {
    nodeType: TNodeType;
    encoder: TEncoder;
  }) =>
  <
    TElementType extends string,
    TRequired extends NodeTypeOptions['required'] = false,
  >(
    elementTypes: ReadonlyArray<TElementType>,
    required?: TRequired,
  ) => {
    const elementDefinition = {
      nodeType,
      elementTypes,
      required,
    } as const satisfies NodeTypeOptions;

    return Type.Transform(
      Type.Unsafe({
        [Kind]: 'Node',
      }),
    )
      .Decode((): ReactNode => {
        throw new Error('Decode not implemented.');
      })
      .Encode((node) => {
        const elements = encoder({
          node: node as ReactNode,
          elementDefinition,
        });

        console.log(elements);

        return elements;
      }) as any;
  };
