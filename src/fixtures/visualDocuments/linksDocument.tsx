import { DocumentProvider, Stack, Typography } from '../../reactComponents';
import { createMockVariantsConfig } from '../mockVariantsConfig';

/** Includes the `hyperlink` variant, which is what colours links in both targets. */
const VARIANTS = createMockVariantsConfig();

const LINKS: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: 'https://example.com/', label: 'Absolute link' },
  { href: 'https://example.com/deep/path?query=1', label: 'Link with a query' },
  { href: 'mailto:ishmael@example.com', label: 'Mail link' },
];

/**
 * Hyperlinks: a standalone link, links inside running prose, and a link inside
 * a list. DOCX turns each into an `ExternalHyperlink` with its own relationship,
 * so a broken mapping shows up as missing or unstyled text.
 */
export function LinksDocument() {
  return (
    <DocumentProvider variants={VARIANTS}>
      <Stack>
        <h1>Links</h1>

        {LINKS.map(({ href, label }) => (
          <p key={href}>
            <a href={href}>{label}</a>
          </p>
        ))}

        <h2>Inside prose</h2>
        <p>
          The <a href="https://example.com/cetology">chapter on cetology</a> is
          the one that classifies whales as folio, octavo and duodecimo, and it
          is followed by <a href="https://example.com/loomings">Loomings</a>.
        </p>

        <h2>Styled link</h2>
        <p>
          <a href="https://example.com/styled">
            <Typography fontWeight="bold">Bold link text</Typography>
          </a>
        </p>

        <h2>Inside a list</h2>
        <ul>
          {LINKS.map(({ href, label }) => (
            <li key={`item_${href}`}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
      </Stack>
    </DocumentProvider>
  );
}
