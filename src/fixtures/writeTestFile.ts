import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const DIST_TEST_PATH = path.resolve(
  path.dirname(
    createRequire(import.meta.url).resolve('matti-docs/package.json'),
  ),
  './dist-test',
);

export const writeTestFile = async (
  fileName: string,
  content: string | Buffer,
) => {
  await fs.mkdir(DIST_TEST_PATH, { recursive: true });
  await fs.writeFile(path.join(DIST_TEST_PATH, fileName), content, {
    encoding: 'utf-8',
  });
};
