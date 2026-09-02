import { DocumentProvider, Stack, Typography } from '../../reactComponents';

/**
 * Nested unordered and ordered lists. In DOCX these become numbering
 * definitions with an indent level per depth, in CSS they are plain list
 * markers; the two only agree if the depth mapping is right.
 */
export function ListsDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Lists</h1>

        <h2>Unordered, two levels deep</h2>
        <ul>
          <li>Cetology, depth one</li>
          <li>The Sperm Whale, depth one</li>
          <ul>
            <li>Folio, depth two</li>
            <li>Octavo, depth two</li>
            <ul>
              <li>Duodecimo, depth three</li>
            </ul>
          </ul>
          <li>The Right Whale, depth one</li>
        </ul>

        <h2>Ordered</h2>
        <ol>
          <li>Loomings</li>
          <li>The Carpet-Bag</li>
          <ol>
            <li>The Spouter Inn</li>
            <li>The Counterpane</li>
          </ol>
          <li>Breakfast</li>
        </ol>

        <h2>List with inline typography</h2>
        <ul>
          <li>
            <Typography fontWeight="bold">Bold item</Typography>
          </li>
          <li>
            <Typography fontStyle="italic">Italic item</Typography>
          </li>
        </ul>
      </Stack>
    </DocumentProvider>
  );
}
