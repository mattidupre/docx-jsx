import { Type } from '@sinclair/typebox';

const ELEMENT_TYPES = [
  'root',
  'document',
  'paragraph',
  'textrun',
  'text',
] as const;

const PAGE_TYPES = ['first', 'even', 'odd', 'default'] as const;

export const PageType = Type.Union(
  PAGE_TYPES.map((pageType) => Type.Literal(pageType)),
);
