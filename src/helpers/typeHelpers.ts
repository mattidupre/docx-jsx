/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'vitest';

export const expectType = <T1, T2 extends T1>() => {};

export const testWithType = <TType>(
  description: string,
  callback: (this: { expectType: <TSubject extends TType>() => void }) => void,
) =>
  test(
    description,
    callback.call({
      expectType: () => undefined,
    }) as any,
  );
