import { asArray } from 'src/utils';
import { type ReactNode } from 'react';

import {
  type Children,
  isPrimitive,
  isIntrinsicElement,
  isFunctionElement,
  isOtherElement,
} from '../entities';

export const callNode = (node: ReactNode): Children => {
  return asArray(node).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.flatMap((v) => callNode(v));
    }

    if (isFunctionElement(value)) {
      return callNode(value.type(value.props));
    }

    if (isOtherElement(value)) {
      return callNode((value.props as any).children);
    }

    if (isIntrinsicElement(value)) {
      return value;
    }

    if (isPrimitive(value)) {
      return value;
    }

    throw new Error('Invalid element.');
  });
};
