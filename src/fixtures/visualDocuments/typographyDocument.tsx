import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { createMockVariantsConfig } from '../mockVariantsConfig';
import { VISUAL_PARAGRAPHS } from './visualText';

/**
 * Created once at module scope: the fixture must render identically every time
 * it is mounted, and `createMockVariantsConfig` returns a fresh clone.
 */
const VARIANTS = createMockVariantsConfig();

/**
 * Every intrinsic heading level, the variant mechanism (paragraph and run
 * scoped) and the inline typography options that have to mean the same thing
 * in CSS and in Word run properties.
 */
export function TypographyDocument() {
  return (
    <DocumentProvider variants={VARIANTS}>
      <Stack>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <h5>Heading 5</h5>
        <h6>Heading 6</h6>

        <Typography as="p" variant="mockParagraphVariant">
          Paragraph variant
        </Typography>
        <p>
          <Typography variant="mockTextVariant">Run variant</Typography>
        </p>
        <Typography as="h2" variant="heading1">
          Heading variant
        </Typography>

        <p>
          <Typography fontWeight="bold">Bold</Typography>{' '}
          <Typography fontStyle="italic">Italic</Typography>{' '}
          <Typography textDecoration="underline">Underline</Typography>{' '}
          <Typography textDecoration="line-through">Strikethrough</Typography>
        </p>
        <p>
          Baseline <sup>superscript</sup> and <sub>subscript</sub>, plus{' '}
          <Typography textTransform="uppercase">uppercase</Typography>.
        </p>
        <p>
          <Typography color="purple">Named colour</Typography>{' '}
          <Typography color="#00ffff">Hex colour</Typography>{' '}
          <Typography color="oklch(70% 0.182 40.73)">OKLCH colour</Typography>{' '}
          <Typography highlightColor="#00ff00">Highlighted</Typography>
        </p>
        <p>
          <Typography fontSize="2rem">Two rem text</Typography>
        </p>

        <Typography as="p" textAlign="left">
          {VISUAL_PARAGRAPHS[0]}
        </Typography>
        <Typography as="p" textAlign="center">
          Centred paragraph
        </Typography>
        <Typography as="p" textAlign="right">
          Right aligned paragraph
        </Typography>
        <Typography as="p" textAlign="justify">
          {VISUAL_PARAGRAPHS[1]}
        </Typography>
        <Typography as="p" marginTop="2rem" marginLeft="2rem">
          Margin top and left
        </Typography>
        <Typography as="p" lineHeight="2rem">
          {VISUAL_PARAGRAPHS[2]}
        </Typography>
      </Stack>
    </DocumentProvider>
  );
}
