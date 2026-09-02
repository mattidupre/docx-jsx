/**
 * A 64x32 PNG of four flat colour quadrants inside a dark frame, small enough to
 * inline and distinctive enough that a rotated, stretched or missing rendering
 * is obvious in a visual baseline.
 *
 * The same bytes are committed as `mockAssets/swatch.png`, so a test can either
 * inline the image with {@link MOCK_IMAGE_DATA_URL} or serve the file from a
 * public directory and get an identical document either way.
 */
export const MOCK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAc0lEQVR4AeXBMRHCQAAAwctNDHxJlOCCGfSgA1ygAxHU1BT0IS6+uN1ljLETtnJ4bRuzXC9PZvk8zkicxEmcxEmcxEmcxEmcxEmcxEmcxK0cTvcvs/zeN2aSOImTOImTOImTOImTOImTOImTOIlbxhg7YX/02wqSGWNf7gAAAABJRU5ErkJggg==';

export const MOCK_IMAGE_DATA_URL = `data:image/png;base64,${MOCK_IMAGE_BASE64}`;

export const MOCK_IMAGE_FILE_NAME = 'swatch.png';

export const MOCK_IMAGE_INTRINSIC_WIDTH = 64;

export const MOCK_IMAGE_INTRINSIC_HEIGHT = 32;
