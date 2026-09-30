import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DocumentType } from '../entities';
import { InternalEnvironmentProvider } from '../reactComponents/InternalEnvironmentProvider';

export type DocumentRootComponent = (
  props: Partial<Record<string, unknown>>,
) => ReactElement;

/**
 * React 19 hoists a `<link rel="preload">` for every `<img>` it renders, and
 * without a `<head>` to put them in, `renderToStaticMarkup` writes them ahead
 * of the root element. They are resource hints, not document content, and the
 * targets expect the document element to be the only root. React escapes `>`
 * in attribute values, so `[^>]*` cannot stop inside one.
 */
const LEADING_PRELOADS_EXP = /^(?:<link rel="preload"[^>]*\/>)+/;

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
  ).replace(LEADING_PRELOADS_EXP, '');
