import { Typography } from '../../reactComponents';
import type { FontsConfig } from '../../entities';

/**
 * The probes use Word's bundled Arial, so that Chrome and Word break lines
 * with the same metrics. The DOCX names the installed font; the PDF serves the
 * file from the script's public directory as {@link FLOW_PARITY_FONT_SRC}. The
 * font file is not part of the repository.
 */
export const FLOW_PARITY_FONT_SRC = '/arial.ttf';

/**
 * A font Word does not ship, served from the repository's mock assets. It has
 * no `docx` source, so the DOCX embeds its file and Word can only lay the
 * embedding probe out in the same font as the PDF if the embedding works.
 */
export const FLOW_PARITY_EMBEDDED_FONT_SRC = '/Merriweather-Regular.ttf';

export const FLOW_PARITY_FONTS: FontsConfig = {
  Arial: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          {
            documentType: 'pdf',
            src: FLOW_PARITY_FONT_SRC,
            format: 'truetype',
          },
          { documentType: 'docx', src: 'Arial', format: 'truetype' },
        ],
      },
    ],
  },
  Merriweather: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          {
            documentType: 'pdf',
            src: FLOW_PARITY_EMBEDDED_FONT_SRC,
            format: 'truetype',
          },
        ],
      },
    ],
  },
};

export const MARGIN = {
  top: '1in',
  right: '1in',
  bottom: '1in',
  left: '1in',
} as const;

const BASE = { fontFamily: 'Arial', fontSize: '12pt' } as const;

type TypographyProps = Parameters<typeof Typography>[0];

export const P = (props: TypographyProps) => (
  <Typography as="p" {...BASE} {...props} />
);
