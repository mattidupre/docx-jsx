import { defineParser } from './createParser';
import { asArray } from 'src/utils';

const parseHtmlChildren = (children: unknown) => asArray(children).join('');

export const parseOptionsToHtml = defineParser({
  document: ({ children, ...options }) => ({
    ...options,
    pagesGroups: children,
  }),
  pagesGroup: ({ children, ...options }) => ({
    ...options,
    html: parseHtmlChildren(children),
  }),
  header: ({ children }) => ({
    html: `<header>${parseHtmlChildren(children)}</header>`,
  }),
  footer: ({ children }) => ({
    html: `<footer>${parseHtmlChildren(children)}</footer>`,
  }),
  paragraph: ({ children }) => `<p>${parseHtmlChildren(children)}</p>`,
  textrun: ({ children, text }) =>
    `<span>${parseHtmlChildren(text ?? children)}</span>`,
  table: ({ children }) => `<table>${parseHtmlChildren(children)}</table>`,
});
