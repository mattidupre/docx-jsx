import { Type } from '@sinclair/typebox';

export const createElementSchemas = ({ ReactNode }) => ({
  document: Type.Object({
    children: ReactNode({ type: 'pagesGroup', required: true }),
  }),
  pagesGroup: Type.Object({
    headers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: ReactNode({ type: 'header', single: true }),
          first: ReactNode({ type: 'header', single: true }),
          even: ReactNode({ type: 'header', single: true }),
          odd: ReactNode({ type: 'header', single: true }),
        }),
      ),
    ),
    children: ReactNode({ type: ['paragraph', 'table'] }),
    footers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: ReactNode({ type: 'footer', single: true }),
          first: ReactNode({ type: 'footer', single: true }),
          even: ReactNode({ type: 'footer', single: true }),
          odd: ReactNode({ type: 'footer', single: true }),
        }),
      ),
    ),
  }),
  header: Type.Object({
    children: ReactNode({
      type: ['paragraph', 'table'],
      required: true,
    }),
  }),
  footer: Type.Object({
    children: ReactNode({
      type: ['paragraph', 'table'],
      required: true,
    }),
  }),
  paragraph: Type.Object({
    children: ReactNode({ type: 'textrun' }),
  }),
  textrun: Type.Object({
    children: ReactNode({ type: 'textrun' }),
  }),
});
