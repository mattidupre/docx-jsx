import { renderHtml } from 'src/lib/html';
import { type ReactElement } from 'react';

export const renderToHtml = (rootEl: ReactElement) => renderHtml(rootEl);
