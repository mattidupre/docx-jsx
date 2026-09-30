import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `dist-test/` at the package root, found from this file rather than by
 * resolving the package's own name, which changes when the package is
 * renamed or scoped.
 */
const DIST_TEST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist-test',
);

export const writeTestFile = async (
  fileName: string,
  content: string | Uint8Array,
) => {
  await fs.mkdir(DIST_TEST_PATH, { recursive: true });
  await fs.writeFile(path.join(DIST_TEST_PATH, fileName), content, {
    encoding: 'utf-8',
  });
};
