// https://github.com/microsoft/TypeScript/issues/14729

declare namespace JSX {
  type IntrinsicElements = never;
  type Element = null | import('.').DXElement;
}
