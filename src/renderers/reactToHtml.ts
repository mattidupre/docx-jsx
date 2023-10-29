import { reactToHtmlObj } from './reactToHtmlObj';
import { htmlObjToHtml } from './htmlObjToHtml';
import { type ReactElement } from 'react';
import { type DocumentOptions } from 'src/entities';

export const reactToHtml = async (
  reactElement: ReactElement,
  documentOptions: DocumentOptions,
) => htmlObjToHtml(await reactToHtmlObj(reactElement), documentOptions);
