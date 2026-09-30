import type { Splitter } from '../profile';
import { textSplitter } from './text';

/**
 * List items break like paragraphs. What differs is rendered: a continued
 * item draws no second marker, and a continued `<ol>` counts on from where
 * the previous page stopped.
 */
export const listSplitter: Splitter = { ...textSplitter };
