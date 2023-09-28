import { it, expect, beforeEach, vi } from 'vitest';
import { createElement, ReactNode } from 'react';
import { renderNode, type RenderCallback } from './renderNode';

const MOCK_ENVIRONMENT = 'test';

const createComponent = (children: any) => createElement(() => children);

const mockElement = createComponent([
  createComponent(123),
  createElement(
    'intrinsic',
    {},
    createComponent('mock_string'),
    createComponent(234),
  ),
]);

const mockCallback: RenderCallback = vi.fn(
  ({ render, element: { type, props } }) => {
    if (type === 'intrinsic') {
      return render(props.children as ReactNode);
    }
    return props.children as string;
  },
);

const expectIntrinsic = expect.objectContaining({
  type: expect.stringMatching(/intrinsic|primitive/),
  props: { children: expect.anything() },
});

let result: any;

beforeEach(() => {
  result = renderNode(MOCK_ENVIRONMENT, mockElement, mockCallback);
});

it('returns an array of expected values', () => {
  expect(result).toEqual(['123', 'mock_string', '234']);
});

it('calls the callback with the context', () => {
  expect(mockCallback).toHaveBeenCalledWith(
    expect.objectContaining({
      render: expect.any(Function),
      element: expectIntrinsic,
      parentElement: expectIntrinsic,
      environment: MOCK_ENVIRONMENT,
    }),
  );
});
