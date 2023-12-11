import { type SimpleCss, parseSimpleCss } from './utils/css';

export const documentStyleObject = {
  a: {
    color: 'inherit',
  },
  'b, em, strong, s, u': {
    fontWeight: 'normal',
    textDecoration: 'none',
    fontStyle: 'normal',
  },
  'h1, h2, h3, h4, h5, h6, p': {
    lineHeight: 'var(--paragraph-line-height)',
    marginBlockStart: '0',
    marginBlockEnd: '0',
    textAlign: 'var(--paragraph-text-align, 1)',
  },
  'h1, h2, h3, h4, h5, h6, p, a, b, em, strong, s, u, span': {
    fontWeight: 'var(--text-font-weight)',
    fontStyle: 'var(--text-font-style)',
    fontSize: 'var(--text-font-size, 1rem)',
    color: 'var(--text-color)',
    textTransform: 'var(--text-text-transform)',
    textDecoration: 'var(--text-text-decoration)',
  },
} satisfies SimpleCss;

export const documentStyleCss = parseSimpleCss(documentStyleObject);
