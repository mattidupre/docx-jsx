import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DocumentType } from '../entities';
import { InternalEnvironmentProvider } from '../reactComponents/InternalEnvironmentProvider';

export type DocumentRootComponent = (
  props: Partial<Record<string, unknown>>,
) => ReactElement;

export const reactToHtml = (
  DocumentRoot: DocumentRootComponent,
  documentType: DocumentType,
) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(InternalEnvironmentProvider, {
      documentType,
      children: createElement(DocumentRoot),
    }),
  );
