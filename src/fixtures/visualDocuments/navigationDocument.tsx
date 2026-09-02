import {
  Bookmark,
  Break,
  DocumentProvider,
  Link,
  List,
  ListItem,
  Stack,
} from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from './visualText';

const SECTIONS: ReadonlyArray<{
  readonly id: string;
  readonly title: string;
}> = [
  { id: 'cetology', title: 'Cetology' },
  { id: 'the-spouter-inn', title: 'The Spouter Inn' },
];

/**
 * Real list numbering and internal navigation.
 *
 * The lists are the point of the first page: a browser draws the markers from
 * `list-style-type` and the `start` attribute, Word draws them from a numbering
 * definition, and the two only agree if the format, the start and the nesting
 * level all survive. The second page holds the bookmarks the first page links
 * to, so a lost destination is a lost jump rather than a lost paragraph.
 *
 * No `hyperlink` variant is configured: Word styles a link through its built-in
 * `Hyperlink` character style whatever the document says, so leaving the variant
 * out keeps the one thing this fixture is about -- the bookmark targets, which
 * are not links -- looking the same in every target.
 */
export function NavigationDocument() {
  return (
    <DocumentProvider>
      <Stack>
        <h1>Navigation</h1>

        <h2>Contents</h2>
        <List ordered>
          {SECTIONS.map(({ id, title }) => (
            <ListItem key={id}>
              <Link bookmark={id}>{title}</Link>
            </ListItem>
          ))}
          <ListItem>
            <Link href="https://example.com/loomings">Loomings, elsewhere</Link>
          </ListItem>
        </List>

        <h2>Numbered from four</h2>
        <List ordered start={4}>
          <ListItem>The fourth item</ListItem>
          <ListItem>The fifth item</ListItem>
        </List>

        <h2>Lettered and roman</h2>
        <List format="upperLetter">
          <ListItem>Upper letter, first</ListItem>
          <ListItem>Upper letter, second</ListItem>
        </List>
        <List format="lowerRoman" start={3}>
          <ListItem>Lower roman, from three</ListItem>
          <ListItem>Lower roman, the next one</ListItem>
        </List>

        <h2>Nested levels</h2>
        <List ordered>
          <ListItem>Depth one</ListItem>
          <List format="lowerLetter">
            <ListItem>Depth two</ListItem>
            <List format="lowerRoman">
              <ListItem>Depth three</ListItem>
            </List>
          </List>
          <ListItem>Depth one again</ListItem>
        </List>

        <h2>Bulleted, unchanged</h2>
        <List>
          <ListItem>A bulleted item</ListItem>
          <ListItem>Another bulleted item</ListItem>
        </List>

        <Break />

        {SECTIONS.map(({ id, title }, index) => (
          <div key={id}>
            <h2>
              <Bookmark id={id}>{title}</Bookmark>
            </h2>
            <p>{VISUAL_PARAGRAPHS[index]}</p>
            <p>
              <Link to="#contents">Back to the contents</Link>
            </p>
          </div>
        ))}

        <p>
          <Bookmark id="contents">The contents are on the first page.</Bookmark>
        </p>
      </Stack>
    </DocumentProvider>
  );
}
