import { it } from 'vitest';
import { build } from '../demo/build';

it('runs without error', async () => {
  await build({ silent: true });
});
