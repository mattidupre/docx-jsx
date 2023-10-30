import puppeteer, { type PuppeteerLaunchOptions } from 'puppeteer-core';
import { reactToHtmlObj } from './reactToHtmlObj';
import { htmlObjToPdf } from './htmlObjToPdf';
import { type ReactElement } from 'react';

export const reactToPdf = async (
  reactElement: ReactElement,
  puppeteerOptions: PuppeteerLaunchOptions,
) => htmlObjToPdf(await reactToHtmlObj(reactElement), puppeteerOptions);
