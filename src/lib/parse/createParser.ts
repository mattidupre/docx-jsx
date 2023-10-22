import { type ElementType, type ParserOptions } from 'src/entities';

export type Parser = <TElementType extends ElementType>(
  inputType: TElementType,
  props: ParserOptions[TElementType],
) => any;

export const defineParser =
  <
    TCallbacks extends {
      [TElementType in ElementType]: (
        props: ParserOptions[TElementType],
      ) => any;
    },
  >(
    callbacks: TCallbacks,
  ) =>
  <TElementType extends ElementType>(
    inputType: TElementType,
    props: ParserOptions[TElementType],
  ) =>
    callbacks[inputType](props);
