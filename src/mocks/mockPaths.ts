import path from 'path';
import { fileURLToPath } from 'url';

export const MOCK_DIST_PATH = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../dist-test',
);
