import { merge } from 'lodash-es';

export const mergeWithDefault = <T>(
  defaultValue: T,
  ...[targetValue, ...values]: ReadonlyArray<undefined | T>
) => {
  // targetValue will otherwise be mutated before it can be extended onto itself.
  const targetValueCloned = structuredClone(targetValue ?? {});
  return merge(targetValue ?? {}, defaultValue, targetValueCloned, ...values);
};
