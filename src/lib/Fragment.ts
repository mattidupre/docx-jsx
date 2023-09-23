import { type Ignored, type Node, isIgnored } from './element';
import { asArray, type Flat } from '../utils/utilities';

export const Fragment = <TChildren extends Node>({
  children,
}: {
  children: TChildren;
}): ReadonlyArray<Exclude<Flat<TChildren>, Ignored>> => {
  const result = asArray(children).filter((value) => {
    return !isIgnored(value);
  });

  return result as any;
};
