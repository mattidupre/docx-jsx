import { buildStyles } from './buildStyles';

/**
 * Tests import the generated stylesheets (and the browser harness
 * bundles them), so they are compiled before any test file is collected.
 */
export default async function setup() {
  await buildStyles();
}
