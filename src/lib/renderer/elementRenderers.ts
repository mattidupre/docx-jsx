import { type RenderContext, type IntrinsicElementProps } from 'src/entities';
import { mapObjectValues } from 'src/utils';

export const ELEMENT_RENDERERS = {
  document: ({ children, ...options }, { renderChildren }) => ({
    ...options,
    children: renderChildren(children, ['section']),
  }),
  section: (
    { children, headers, footers },
    { renderChildren, renderChild },
  ) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
      headers: mapObjectValues(headers ?? {}, (_, header) =>
        renderChild(header, ['header']),
      ),
      footers: mapObjectValues(footers ?? {}, (_, footer) =>
        renderChild(footer, ['footer']),
      ),
    };
  },
  header: ({ children }, { renderChildren }) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
    };
  },
  footer: ({ children }, { renderChildren }) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
    };
  },
  paragraph: ({ children, ...options }, { renderChildren }) => {
    return {
      children: renderChildren(children, ['textrun']),
      ...options,
    };
  },
  textrun: ({ children, ...options }, { renderChildren }) => {
    const renderedChildren = renderChildren(children, ['textrun']);
    return {
      children: renderedChildren.length >= 1 ? renderedChildren : undefined,
      ...options,
    };
  },
  table: (props: Record<string, never>) => ({}) as Record<string, never>,
} as const satisfies {
  [K in keyof IntrinsicElementProps]: (
    props: IntrinsicElementProps[K],
    context: RenderContext,
  ) => IntrinsicElementProps<any>[K];
};
