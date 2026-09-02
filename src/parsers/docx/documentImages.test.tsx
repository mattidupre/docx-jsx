import { describe, expect, it } from 'vitest';
import { DocumentProvider, Image, Stack } from '../../reactComponents';
import { reactToHtml } from '../../lib/reactToHtml';
import {
  MOCK_IMAGE_DATA_URL,
  MOCK_IMAGE_INTRINSIC_HEIGHT,
  MOCK_IMAGE_INTRINSIC_WIDTH,
} from '../../fixtures/mockImage';
import { resolveDocumentImages } from './documentImages';

const documentHtml = (src: string) =>
  reactToHtml(
    () => (
      <DocumentProvider>
        <Stack>
          <Image src={src} alt="Fixture" width="1in" />
        </Stack>
      </DocumentProvider>
    ),
    'docx',
  );

const resolveOne = async (src: string) => {
  const images = await resolveDocumentImages(documentHtml(src), {});
  const image = images.get(src);
  if (!image) {
    throw new Error('The image source was not collected from the document.');
  }
  return image;
};

const toDataUrl = (bytes: ReadonlyArray<number>) =>
  `data:image/x;base64,${Buffer.from(Uint8Array.from(bytes)).toString(
    'base64',
  )}`;

const bigEndian16 = (value: number) => [value >> 8, value & 0xff];

const bigEndian32 = (value: number) => [0, 0, ...bigEndian16(value)];

const littleEndian16 = (value: number) => [value & 0xff, value >> 8];

/** Signed, because a top-down BMP writes its height as a negative number. */
const littleEndian32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, value, true);
  return [...bytes];
};

/** Signature, then the IHDR chunk's length and type, then the size. */
const pngBytes = (width: number, height: number) => [
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0,
  0,
  0,
  13,
  0x49,
  0x48,
  0x44,
  0x52,
  ...bigEndian32(width),
  ...bigEndian32(height),
];

/** Start of image, an APP0 segment to skip over, then a baseline frame. */
const jpegBytes = (width: number, height: number) => [
  0xff,
  0xd8,
  0xff,
  0xe0,
  0x00,
  0x04,
  0x00,
  0x00,
  0xff,
  0xc0,
  0x00,
  0x11,
  0x08,
  ...bigEndian16(height),
  ...bigEndian16(width),
  0x03,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
];

const gifBytes = (width: number, height: number) => [
  0x47,
  0x49,
  0x46,
  0x38,
  0x39,
  0x61,
  ...littleEndian16(width),
  ...littleEndian16(height),
];

/** File header, then a BITMAPINFOHEADER whose height is negative (top-down). */
const bmpBytes = (width: number, height: number) => [
  0x42,
  0x4d,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  54,
  0,
  0,
  0,
  40,
  0,
  0,
  0,
  ...littleEndian32(width),
  ...littleEndian32(-height),
];

describe('resolveDocumentImages', () => {
  it('collects only the sources the document actually refers to', async () => {
    const images = await resolveDocumentImages(
      documentHtml(MOCK_IMAGE_DATA_URL),
      {},
    );

    expect([...images.keys()]).toEqual([MOCK_IMAGE_DATA_URL]);
  });

  it('reads the type and intrinsic size of the fixture PNG', async () => {
    const image = await resolveOne(MOCK_IMAGE_DATA_URL);

    expect(image.type).toBe('png');
    expect(image.intrinsicWidth).toBe(MOCK_IMAGE_INTRINSIC_WIDTH);
    expect(image.intrinsicHeight).toBe(MOCK_IMAGE_INTRINSIC_HEIGHT);
  });

  it.each([
    ['png', pngBytes(120, 45)],
    ['jpg', jpegBytes(120, 45)],
    ['gif', gifBytes(120, 45)],
    ['bmp', bmpBytes(120, 45)],
  ] as const)('reads a %s header', async (type, bytes) => {
    const image = await resolveOne(toDataUrl(bytes));

    expect(image.type).toBe(type);
    expect(image.intrinsicWidth).toBe(120);
    expect(image.intrinsicHeight).toBe(45);
  });

  it('rejects a format Word cannot draw', async () => {
    const webpLikeSrc = toDataUrl([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]);

    await expect(resolveOne(webpLikeSrc)).rejects.toThrow(
      'is not a PNG, JPEG, GIF or BMP',
    );
  });

  it('rejects a data URL that is not base64 encoded', async () => {
    await expect(resolveOne('data:image/png,%89PNG')).rejects.toThrow(
      'not base64 encoded',
    );
  });

  it('names the source and where it looked when a file is missing', async () => {
    const html = documentHtml('/missing/logo.png');

    await expect(
      resolveDocumentImages(html, { publicDirectory: '/no/such/directory' }),
    ).rejects.toThrow(/\/missing\/logo\.png[\S\s]*\/no\/such\/directory/);
  });
});
