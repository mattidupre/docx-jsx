import { reactToHtmlObj } from './reactToHtmlObj';
import { htmlObjToPdf } from './htmlObjToPdf';
import { type ReactElement } from 'react';

export const reactToPdf = async (reactElement: ReactElement) =>
  htmlObjToPdf(await reactToHtmlObj(reactElement));
