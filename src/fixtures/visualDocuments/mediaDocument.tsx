import {
  Divider,
  DocumentProvider,
  Image,
  Spacer,
  Stack,
} from '../../reactComponents';
import { MOCK_IMAGE_DATA_URL } from '../mockImage';
import { VISUAL_PARAGRAPHS } from './visualText';

/**
 * `Image`, `Divider` and `Spacer` on one page.
 *
 * The image is inlined as a `data:` URL rather than served from a public
 * directory, so all three targets get the same bytes from the fixture itself
 * and the baseline cannot drift with a renderer's file resolution. The swatch
 * is asymmetric on both axes, which is what makes a wrong aspect ratio or a
 * flipped picture visible in a baseline rather than merely a size difference.
 *
 * The rules and the gap are the reconciliation the fixture is really for: an
 * empty Word paragraph is a full line of body text unless its line spacing is
 * pinned, so a `Divider` or a `Spacer` that lost its exact spacing shows up as
 * everything below it sliding down the DOCX page.
 */
export function MediaDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Media</h1>
        <p>{VISUAL_PARAGRAPHS[0]}</p>

        <Divider color="#333333" thickness="1px" />

        <h2>Aligned images</h2>
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Colour swatch, left"
          width="2in"
          align="left"
        />
        <Spacer height="0.25in" />
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Colour swatch, centred"
          width="2in"
          align="center"
        />
        <Spacer height="0.25in" />
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Colour swatch, right"
          width="2in"
          align="right"
        />

        <Divider
          color="#cc3333"
          thickness="3px"
          spaceBefore="0.25in"
          spaceAfter="0.25in"
        />

        <h2>Height from the aspect ratio</h2>
        <p>{VISUAL_PARAGRAPHS[1]}</p>
        <Image
          src={MOCK_IMAGE_DATA_URL}
          alt="Colour swatch sized by height"
          height="0.5in"
          align="left"
        />

        <Divider color="#3366cc" thickness="2px" width={40} />

        <h2>Fixed gap</h2>
        <p>Above a half-inch gap.</p>
        <Spacer height="0.5in" />
        <p>Below a half-inch gap.</p>
      </Stack>
    </DocumentProvider>
  );
}
