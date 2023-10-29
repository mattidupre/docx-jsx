import { Type, Kind, TypeRegistry, type TSchema } from '@sinclair/typebox';
import { type ElementType } from 'src/entities';

TypeRegistry.Set<any>('Node', () => true);

export type ElementRelation = (options: {
  type: ElementType | ReadonlyArray<ElementType>;
  single?: boolean;
  required?: boolean;
}) => TSchema;

export const Relation: ElementRelation = ({ type, required, single }) =>
  Type.Unsafe({
    [Kind]: 'Node',
  });
