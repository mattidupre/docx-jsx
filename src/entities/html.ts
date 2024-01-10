import { kebabCase } from 'lodash';

// TODO: Add more semantic HTML TagNames.
//* IMPORTANT: Keep these in sync with base styles.
export type TagName = keyof Pick<
  JSX.IntrinsicElements,
  | 'div'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'ul'
  | 'ol'
  | 'li'
  | 'a'
  | 'b'
  | 'strong'
  | 'i'
  | 'em'
  | 's'
  | 'u'
  | 'sub'
  | 'sup'
  | 'span'
>;

export type HtmlAttributes = Record<string, string>;
