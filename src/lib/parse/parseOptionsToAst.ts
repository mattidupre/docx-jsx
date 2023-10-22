import { defineParser } from './createParser';

export const parseOptionsToAst = defineParser({
  document: (options) => ({ type: 'document', options }),
  pagesGroup: (options) => ({ type: 'pagesGroup', options }),
  header: (options) => ({ type: 'header', options }),
  footer: (options) => ({ type: 'footer', options }),
  paragraph: (options) => ({ type: 'paragraph', options }),
  textrun: (options) => ({ type: 'textrun', options }),
  table: (options) => ({ type: 'table', options }),
});
