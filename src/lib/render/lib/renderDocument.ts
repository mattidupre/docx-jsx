import { type ReactElement, type ReactNode } from 'react';

type RenderNode = (node: ReactNode) => ReadonlyArray<ReactElement>;

export const renderDocument = (
  rootEl: ReactElement,
  renderNode: RenderNode,
) => {};
