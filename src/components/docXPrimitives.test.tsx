import { it, expect, describe } from 'vitest';
import { DOCX_CLASS_NAMES } from '../lib/docXClasses';
import * as allPrimitives from './docXPrimitives';
import { TextRun } from './docXPrimitives';

it('defines all DocX classes as Primitives', () => {
  DOCX_CLASS_NAMES.every((className) =>
    expect(allPrimitives[className]).toBeDefined(),
  );
});

describe('creating TextRun', () => {
  describe('with a string child', () => {
    const element = TextRun({ children: 'abc' });
    it('creates a TextRun element', () => {
      expect(element).toEqual(expect.objectContaining({ type: 'TextRun' }));
    });

    it('containing a TextRun child', () => {
      expect(element.props.children).toEqual([
        expect.objectContaining({ type: 'TextRun' }),
      ]);
    });
  });

  describe('with a number child', () => {
    const element = TextRun({ children: 123 });
    it('creates a TextRun element', () => {
      expect(element).toEqual(expect.objectContaining({ type: 'TextRun' }));
    });

    it('containing a TextRun child', () => {
      expect(element.props.children).toEqual([
        expect.objectContaining({ type: 'TextRun' }),
      ]);
    });
  });

  describe('with an array child', () => {
    const element = TextRun({ children: ['abc', 123] });
    it('creates a TextRun element', () => {
      expect(element).toEqual(expect.objectContaining({ type: 'TextRun' }));
    });

    it('containing a TextRun child', () => {
      expect(element.props.children).toEqual([
        expect.objectContaining({ type: 'TextRun' }),
        expect.objectContaining({ type: 'TextRun' }),
      ]);
    });
  });
});
