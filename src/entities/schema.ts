import { Type } from '@sinclair/typebox';

import { defineSchema } from 'src/lib/schema';

export const schema = defineSchema(({ Child, Children }) => ({
  document: Type.Object({
    children: Children(['pagesGroup'], true),
  }),
  pagesGroup: Type.Object({
    headers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: Child(['header']),
          first: Child(['header']),
          even: Child(['header']),
          odd: Child(['header']),
        }),
      ),
    ),
    children: Children(['paragraph', 'table']),
    footers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: Child(['footer']),
          first: Child(['footer']),
          even: Child(['footer']),
          odd: Child(['footer']),
        }),
      ),
    ),
  }),
  header: Type.Object({
    children: Children(['paragraph', 'table'], true),
  }),
  footer: Type.Object({
    children: Children(['paragraph', 'table'], true),
  }),
  paragraph: Type.Object({
    children: Children(['textrun']),
  }),
  textrun: Type.Object({
    children: Children(['textrun']),
  }),
}));
