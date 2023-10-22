/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'vitest';
export const expectType = () => { };
export const testWithType = (description, callback) => test(description, callback.call({
    expectType: () => undefined,
}));
//# sourceMappingURL=typeHelpers.js.map