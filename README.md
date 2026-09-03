# matti-docs

One React tree, four renderings: static HTML, a live in-browser preview, a PDF
and a Word `.docx`. The tree is written with layout primitives
(`DocumentProvider` → `Stack` → typography and layout components) rather than
with free-form markup, so page size, margins, running headers and footers,
columns, grids and page counters mean the same thing in every target.

The library is aimed at **paginated** documents — résumés, reports, book-like
sections with running headers — not at web pages that happen to print.

Two ideas hold it together:

- **A unified typography model.** `TypographyOptions` is a CSS-shaped object.
  For browsers it compiles to CSS custom properties; for Word it compiles to
  `docx` run and paragraph properties. A variant named `heading1` resolves to
  the same size, weight and colour in all four outputs.
- **One structural pass.** Every component funnels through an internal element
  that serialises `{elementType, elementOptions, contentOptions, variant}` into
  `data-matti-docs-*` attributes. Each target parses that same annotated HTML,
  so the targets cannot drift structurally — only in the details a target
  genuinely cannot express.

## Install

```sh
pnpm add matti-docs
```

Node 22.12 or newer (`engines.node`). The floor is the one `puppeteer-core` 25
imposes. Development runs on Node 24, the current LTS, and `.nvmrc` pins that
major.

Peer dependencies (all declared optional, so a consumer that only renders DOCX
on a server does not have to install the DOM half):

| Package | Range |
| --- | --- |
| `react` | `18.x` |
| `react-dom` | `18.x` |
| `react-reconciler` | `^0.29.0` |
| `@types/react` | `18.x` |
| `@types/react-dom` | `18.x` |

Entry points are subpath exports, one per module:

```ts
import { DocumentProvider, Stack, Typography } from 'matti-docs/reactComponents';
import { reactToDocx } from 'matti-docs/reactToDocx';
import { reactToDom } from 'matti-docs/reactToDom';
import { reactToHtmlDocument } from 'matti-docs/reactToHtmlDocument';
import { reactToPdf } from 'matti-docs/reactToPdf';
import { reactToScript } from 'matti-docs/reactToScript';
import { isErrorObject } from 'matti-docs/utils';
```

### Chrome is required for PDF

PDF generation paginates the document in a real browser (pagedjs) and then calls
`page.pdf()`. `reactToPdf` does **not** launch or download a browser: it takes a
`Browser` from `puppeteer-core` that the caller owns and is responsible for
closing.

```ts
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath:
    process.env.MATTI_DOCS_CHROME_PATH ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
```

`MATTI_DOCS_CHROME_PATH` is the environment variable this repository's own
fixtures (`src/fixtures/puppeteerOptions.ts`), tests and demo build read, falling
back to the macOS Google Chrome path above. Set it before running the test suite
on a machine where Chrome lives elsewhere.

## A document, end to end

```tsx
import {
  DocumentProvider,
  PageCount,
  PageNumber,
  Stack,
  Typography,
} from 'matti-docs/reactComponents';

const variants = {
  heading1: { fontSize: '2rem', fontWeight: 'bold', color: '#1a1a1a' },
  caption: { fontSize: '0.75rem', color: '#666666' },
};

export function Document() {
  return (
    <DocumentProvider size={{ width: '8.5in', height: '11in' }} variants={variants}>
      <Stack
        margin={{ top: '1in', bottom: '1in', header: '0.5in' }}
        layouts={{
          first: { header: <Typography as="p">Moby-Dick</Typography> },
          subsequent: {
            header: <Typography as="p">Moby-Dick</Typography>,
            footer: (
              <Typography as="p" variant="caption" textAlign="right">
                Page <PageNumber /> of <PageCount />
              </Typography>
            ),
          },
        }}
      >
        <Typography as="h1" variant="heading1">
          Loomings
        </Typography>
        <Typography as="p">Call me Ishmael.</Typography>
      </Stack>
    </DocumentProvider>
  );
}
```

### Render it

```ts
// DOCX -> Buffer
const docx = await reactToDocx(Document, {
  fonts,            // FontsConfig; overrides fonts declared on DocumentProvider
  publicDirectory,  // where a non-data: `Image` src is read from
  svgImages,        // { [svgId]: { data, width, height } } rasterised `Svg`s
});

// PDF -> Uint8Array, or `{ error }` (see `isErrorObject`)
const pdf = await reactToPdf(Document, {
  browser,          // required: a puppeteer-core Browser
  closeBrowser,     // close it when finished; defaults to false
  fonts,
  publicDirectory,  // served to the page by a request interceptor
  pageStyleSheets,  // CSS added to the page itself: this is where @font-face goes
  styleSheets,      // CSS added to the paginated document
});

// A standalone HTML file that paginates itself in the browser -> string
const html = await reactToHtmlDocument(Document);

// A detached, paginated HTMLElement, for a live preview -> HTMLElement
const element = await reactToDom(Document, {
  initialStyleSheets,
  styleSheets,
  pageClassName,
  fonts,
  onDocument,       // receives the parsed DocumentElement
});

// The IIFE that reactToHtmlDocument inlines -> string
const script = reactToScript(Document, { targetQuery: '#rendered', pageClassName });
```

`reactToPdf` resolves to `{ error: unknown }` instead of throwing. Narrow it with
`isErrorObject` from `matti-docs/utils` before treating the result as bytes.

`pageStyleSheets` and `styleSheets` are not interchangeable: `@font-face` is
ignored inside a shadow root, so font declarations belong in `pageStyleSheets`
while rules that style document content belong in `styleSheets`.

### In-browser preview

```tsx
import { Preview, usePreview } from 'matti-docs/reactComponents';

<Preview autoscale styleSheets={[css]} Loading={() => <p>Loading…</p>}>
  <Document />
</Preview>;
```

`Preview` is a thin component over `usePreview(children, options)`, which returns
`{ isLoading, previewElRef }` and accepts everything `reactToDom` accepts plus
`autoscale`. Pages are rendered into the light DOM with `@scope`d stylesheets and
carry the class `matti-docs-page` (`matti-docs-page__header`, `__content`,
`__footer` for the three regions), so a consumer stylesheet can reach them.

## Targets and environments

`documentType` is one of `web`, `pdf`, `docx`.

| Entry point | `documentType` | Notes |
| --- | --- | --- |
| `reactToDocx` | `docx` | Structural annotations serialised into the markup, then mapped to `docx` objects. |
| `reactToPdf` | `pdf` | Same markup, paginated by pagedjs in Chrome, then printed. |
| `reactToDom` / `reactToHtmlDocument` / `reactToScript` / `Preview` | `pdf` | The DOM target *is* the PDF target; the PDF is a print of it. |
| A `DocumentProvider` rendered directly by React DOM | `web` | Unpaginated. Headers and footers are not rendered, and `PageNumber`/`PageCount` warn. |

`useEnvironment()` returns `{ documentType, isPreview }`; `IfEnvironment` renders
a subtree only for matching environments. Use it for content that only makes
sense in one target (an "on the web" call to action, a print-only note).

## Component reference

| Component | Purpose | HTML / DOM / PDF | DOCX | Notes and limits |
| --- | --- | --- | --- | --- |
| `DocumentProvider` | Document root: page size, variants, prefixes, fonts | Wrapper element carrying the encoded document config; injects the variant stylesheet when `injectEnvironmentCss` | `Document` with generated `styles` and `numbering` | Defaults to 8.5in × 11in. Nesting a provider with different variants or prefixes throws. |
| `ContentProvider` | Variants and prefixes without a document | Adopted stylesheet when `injectEnvironmentCss` and `documentType === 'web'` | Context only; contributes no content | Use to style library components outside a document (Storybook, a web page). |
| `Stack` | A page section: margins, columns, running header and footer | One `PageTemplate` per layout; pagedjs chunks content into pages | One `ISectionOptions` per stack (page size, margins, `column`, first/default headers and footers) | `continuous` starts the section on the current page. A page belongs to the stack whose content starts it, and gets that stack's `first` layout only when it also starts the stack. A multi-column stack emits a second, empty continuous section so the columns do not fill the page. |
| `Typography` | A styled tag plus an optional variant | The tag from `as`, with typography written as CSS custom properties and the variant class | Run properties, or paragraph properties when the tag is a paragraph tag | `as` defaults to `span`. |
| `Break` | Force a page or column break | `break-after: page`, rewritten to pagedjs's `data-break-after` / `data-previous-break-after` attribute pair; inside a multi-column stack, `break-after: column` | `PageBreak`, or `ColumnBreak` inside a multi-column stack; wrapped in a paragraph when not already inside one | pagedjs only breaks *onto* an element, so a trailing break gets an empty carrier element appended. |
| `BreakAvoid` | Keep a subtree together | `break-inside: avoid` (and `break-after: avoid` with `after`) | `keepLines` on paragraph children, `keepNext` on all but the last; a `Table` keeps itself together with `cantSplit` on its rows | `breakInside` accumulates down the element context, so a nested table inherits it. pagedjs never splits a fixed-height block: a block taller than the page overflows silently. |
| `PageNumber` | The current page number | An empty `<span>` filled in per page while the page template is built | `TextRun` with the `PAGE` field | Warns when rendered with `documentType: 'web'`, which has no pages. |
| `PageCount` | The total page count | Same | `TextRun` with the `NUMPAGES` field | Same. docx-preview does not evaluate Word fields, so the visual pipeline sees these as blank. |
| `Split` | A left/right row | `display: flex; justify-content: space-between` | A one-row, two-cell borderless `Table` at 100% width | Reads exactly two children — its `left` and `right` props — structurally. |
| `TabSplit` | A left/right row inside one paragraph | Flex layout inside the tag from `as` (a paragraph tag) | A right-aligned tab stop at the content width plus a `w:tab` run | Uses an ordinary tab stop rather than `w:ptab`: Word draws both, but most other readers ignore `w:ptab` and run the two sides together. |
| `Grid` / `GridItem` | A column grid | Floated items with `calc()` widths and half-gap margins | A borderless `Table`; each item is a cell with `columnSpan` equal to its size, and rows wrap when the next item overflows | `columnCount` defaults to 12. An item wider than the grid is clamped to a full row in both targets. A short final row is padded with a filler cell. |
| `Table` / `TableRow` / `TableCell` | A data table | A `<table>` with `border-collapse: collapse`, a `<colgroup>` of `<col>` widths (with `table-layout: fixed`), a `<thead>` of the header rows and a `<tbody>` of the rest; borders, padding, spans, alignments, `background-color` and widths as inline styles and attributes on every `<th>`/`<td>` | A `Table` with `w:tblW`, a `w:tblGrid` in twips, all six `w:tblBorders`, `w:tblCellMar` for `cellPadding`, `w:tblHeader` on header rows, `w:cantSplit`, `w:gridSpan`, `w:vMerge`, `w:vAlign` and `w:shd` | Header rows repeat across pages in Word only: pagedjs 0.4 rebuilds a split table's ancestors without their children, so the continuation table has no `<thead>`. Rows keep together by default (`break-inside: avoid` on the row *and* its cells, `cantSplit` in Word). A header row is hoisted into `<thead>` only when it is a direct `TableRow` child. |
| `Image` | A raster image | `<img src alt>` sized with CSS; the omitted axis is `auto`; `align` makes it a block with auto margins | `ImageRun` sized in pixels at 96 DPI, inside a `Paragraph` whose alignment matches `align` | At least one of `width`/`height` is required. `src` is a `data:` URL, or a path resolved against `publicDirectory` (served to Chrome for PDF, read with `node:fs` for DOCX). The omitted axis comes from the intrinsic size in the file header. |
| `Divider` | A horizontal rule | A zero-height `<div>` with `border-top` and margins | An empty `Paragraph` with a single bottom border, `spacing.before`/`after` in twips, and its line pinned to the rule thickness | Not `<hr>`: its user-agent thickness, colour and margins differ from Word's. `width` is a percentage of the content width — a CSS `width` in the browser, a right indent in Word. |
| `Spacer` | Vertical space | An empty `<div>` with an explicit `height` and no margins | An empty `Paragraph` with exact line spacing equal to `height` and zero before/after | Exact line spacing is the only paragraph height Word does not adjust for the font. |
| `List` / `ListItem` | A numbered or bulleted list | `<ol>`/`<ul>` with `list-style-type`, the `start` attribute and the `<ol>` `type` attribute; `<li>` items | A declared abstract numbering (nine levels, the requested format, indent and start) plus a `w:numPr` on every item paragraph | Lists that draw the same markers share a definition but never an instance, so numbering never continues across lists. A `variant` on a `ListItem` keeps its paragraph style; without one Word applies its own `ListParagraph`. Nesting a `List` inside a `ListItem` increases the level. |
| `Link` / `Bookmark` | Hyperlinks and destinations | `<a href>` (an internal target as `#id`) and `<a id>` | `ExternalHyperlink` with a relationship, or `InternalHyperlink` anchored on a bookmark; `Bookmark` becomes a `w:bookmarkStart`/`w:bookmarkEnd` pair | `Link` takes exactly one of `href`, `to` (`#id`) and `bookmark` (`id`). Bookmark names are escaped to OOXML tokens and truncated to 40 characters. Word applies its built-in `Hyperlink` character style, which the `hyperlink` variant mirrors in CSS via `a[href]`. |
| `Raw` | Escape hatch for raw markup | The tag named by `as`, with the remaining props passed through as attributes and the subtree written as authored | Text mapped through the standard tag handling: paragraph tags become paragraphs, `b`/`em`/`u`/`s`/`sup`/`sub` become run properties, `a` becomes a hyperlink, loose text is gathered into a paragraph | Layout written as raw CSS (float, flex, grid, positioning) reaches only the browser targets. |
| `Svg` | Inline SVG | The SVG markup as written, in the SVG namespace | An `ImageRun` built from a PNG supplied in `svgImages`, keyed by the `<svg>` `id` | Without a matching entry the element renders as nothing and the DOCX target warns once, naming the `id`. Word's picture parts hold bitmaps only. |
| `IfEnvironment` | Target-conditional rendering | Evaluated during render; nothing is emitted for a non-matching environment | Same | Matches on `documentType` and `isPreview`; `not` inverts. |
| `Preview` | A live, paginated preview in the browser | `reactToDom` output attached to a `<div>`, optionally autoscaled to the container | n/a | Browser only. `usePreview` is the hook underneath. |

Hooks: `useEnvironment()`, `usePageSize()` (inside a `DocumentProvider`),
`usePageMargins()` (inside a `Stack`). The last two throw outside their provider.

`createStylesArray` / `createStylesString` build the variant stylesheet for a
`{ variants, prefixes }` pair, for consumers that want to ship the CSS
themselves rather than have it injected.

### Data tables

`Table` is the semantic table; `Grid` and `Split` are borderless layout tables
and stay that way.

```tsx
<Table columnWidths={[3, 1]} borders={{ color: '#999999' }} cellPadding="6px">
  <TableRow header fontWeight="bold">
    <TableCell>Chapter</TableCell>
    <TableCell align="right">Page</TableCell>
  </TableRow>
  <TableRow>
    <TableCell>Loomings</TableCell>
    <TableCell align="right">1</TableCell>
  </TableRow>
</Table>
```

`columnWidths` takes either absolute lengths (`['2in', '1in']`) or unitless
weights that share the table between the columns (`[3, 1]`); the same numbers
become `<col>` widths and a per-cell `width` in the browser and the `w:tblGrid`
and each `w:tcW` in Word. Leaving it out lets the columns size themselves to
their content in both targets. `width` on the table (and on a cell) is a
percentage as a number and absolute as a length, the same convention `Divider`
uses.

A cell holds bare text, a `Typography`, a `List` or any other block: Word has no
inline content outside a paragraph, so anything that is not already a block is
gathered into one. `rowSpan` reaches Word as `w:vMerge` — `docx` writes the
continuation cells of the rows below — so it means the same thing in all three
targets. `TableRow` and `TableCell` must be rendered inside their parents, and a
bare `<table>`, `<tr>`, `<td>` or `<th>` written as markup is refused rather
than flattened into loose text in the DOCX.

## The typography model

`TypographyOptions` is the single vocabulary. Every key is CSS-named; each value
may also be an array, in which case the last defined entry wins (this is how a
variant can declare `color: ['--brand', '#00dddd']`).

```ts
type TypographyOptions = {
  breakInside, breakAfter, textAlign, lineHeight,
  fontWeight, fontStyle, fontSize, fontFamily, color,
  textTransform, textDecoration, textIndent,
  marginTop, marginRight, marginBottom, marginLeft,
  paddingBottom, borderBottomWidth, borderBottomColor,
  whiteSpace,
  highlightColor, superScript, subScript,
};
```

Lengths are `px`, `pt`, `rem`, `in` or `cm`. `rem` resolves against a fixed 16px
root in every target, because Word has no cascade to resolve it against.
`lineHeight` may also be a unitless multiplier, which becomes automatic line
spacing in Word; a length becomes exact line spacing.

**Variants** are named `TypographyOptions`, declared once on `DocumentProvider`
(or `ContentProvider`) and referenced by name:

```tsx
<DocumentProvider variants={{ heading1: { fontSize: '2rem', color: '#ff00ff' } }}>
  <Typography as="h2" variant="heading1">Etymology</Typography>
</DocumentProvider>
```

- In CSS a variant becomes a rule setting custom properties on
  `.matti-docs-variant-heading1`, plus — for the intrinsic variant names
  `title`, `heading1`..`heading6`, `strong`, `listParagraph`, `hyperlink` — the
  matching bare tag, wrapped in `:where()` so an explicit variant still wins.
- In DOCX a variant becomes a paragraph style linked to a character style (the
  `Heading1` / `Heading1Char` convention), so the same variant can be applied to
  a block tag or an inline one. `heading1`..`heading6` and `listParagraph` are
  written onto Word's built-in paragraph styles and `hyperlink` onto its built-in
  character style, which is what makes the navigation pane, the outline view and
  a generated table of contents recognise them. Any other name gets a custom
  style id, escaped to a single token (`Job Title` → `JobX0020Title`).

**Prefixes** control every generated name. `prefixes` accepts a string shorthand
or a partial object:

```tsx
<DocumentProvider prefixes={{ elementClassName: 'doc-el', variantClassName: 'doc-v', cssVariable: 'doc' }}>
```

| Key | Default | Produces |
| --- | --- | --- |
| `elementClassName` | `matti-docs-element` | `matti-docs-element-grid-item` — one class per element type, styled by nothing in the library, for consumer CSS to hook onto |
| `variantClassName` | `matti-docs-variant` | `matti-docs-variant-heading1` |
| `cssVariable` | `matti-docs` | `--matti-docs-font-size` |

Class order on an element is author → element → variant.

**The intrinsic heading scale.** `h1`..`h6` are resolved once, in
`entities/typography.ts`, from the user-agent `em` ratios against the 16px root,
into absolute `px` sizes and margins. The same table produces the CSS
`:where(h1)` rules and the DOCX `Heading1`..`Heading6` styles, so headings match
without either target relying on its own defaults. Both are the lowest-priority
source in their target.

**Fonts.** A `FontsConfig` maps a family name to font faces, each with per-target
sources: a file for `web`/`pdf` (emitted as `@font-face`) and an installed Word
font name for `docx`. Declare them once on `DocumentProvider`, or pass `fonts` to
a renderer to override.

```ts
const fonts = {
  Merriweather: {
    fontFaces: [
      {
        fontWeight: '400',
        fontStyle: 'normal',
        sources: [
          { documentType: 'web', src: 'Merriweather-Regular.ttf', format: 'truetype' },
          { documentType: 'docx', src: 'Calibri', format: 'truetype' },
        ],
      },
    ],
  },
};
```

A source with no `documentType` serves both browser targets. A `docx` source
names a font on the reader's machine and is never used as a file.

## Testing

```sh
pnpm test                 # vitest, watch mode
pnpm exec vitest run      # one pass
pnpm test:coverage        # v8 coverage over all of src, reported on failure too
pnpm test:visual          # the visual regression suite only
pnpm test:visual:update   # rewrite every image baseline
pnpm typecheck            # tsc --noEmit, on TypeScript 7
pnpm lint                 # eslint ./src, on ESLint 10
```

Both of those are set up in [Type checking and linting](#type-checking-and-linting).

Chrome must be reachable (see above) for the PDF, DOM and visual suites. Every
test file that launches Chrome shares one browser and closes it in `afterAll`.

On a loaded machine, several test files launching Chrome at once can starve each
other into `Protocol error: Connection closed`. Run the suite one file at a time
instead:

```sh
pnpm exec vitest run --no-file-parallelism
```

`--no-file-parallelism` replaces the `--no-threads` of Vitest 0.x, which is now
an unknown-option error. The default pool is `forks`, so `--pool=threads` is
what opts back into worker threads.

`-u`/`--update` takes an optional value in Vitest 4, so it swallows a following
path: write `pnpm exec vitest run src/lib/styles.test.ts -u`, never
`vitest run -u src/lib/styles.test.ts` (that updates the whole suite).

### Visual regression

`src/visual/` rasterises all three targets in Chrome and compares them:

- `htmlToPngPages` screenshots the self-paginating HTML document.
- `pdfToPngPages` renders the PDF with pdfjs.
- `docxToPngPages` renders the DOCX with docx-preview.

Every renderer produces 96 DPI pages, so a default page is 816 × 1056 px in all
three. Fixtures live in `src/fixtures/visualDocuments/` (typography, grid, split,
columns, breaks, lists, links, svg, media, navigation) and each is asserted four
ways: page images against the committed baseline, page size, HTML page count
against PDF page count, and a **DOCX-vs-PDF drift** metric — the mean/max
mismatch ratio over the pages both targets produced, asserted only as an upper
bound, because two different rasterisers never agree pixel for pixel.

Baselines are PNGs at `src/visual/__image_snapshots__/<fixture>-<target>-page-NN.png`.

```sh
# Refresh one fixture's baselines
UPDATE_SNAPSHOTS=1 pnpm exec vitest run src/visual -t "media"
```

`CI=true` makes a missing baseline a failure rather than silently creating one.
Each run also writes a side-by-side contact sheet per fixture to
`dist-visual/<fixture>.html`, with an index at `dist-visual/index.html`.

Known limits of the pipeline:

- docx-preview lays the OOXML out in the browser; it does **not** reflow content
  across sheets or across columns the way Word does, so a multi-column document
  legitimately reports a different DOCX page count. Only the pages both targets
  produced are compared.
- docx-preview ignores Word fields, so `PageNumber` and `PageCount` are blank in
  the DOCX raster.
- There is no Word automation, so nothing in this repository verifies how Word
  itself lays a document out. The DOCX assertions that matter are the OOXML ones
  (`src/fixtures/docxInspect.ts` unzips a buffer and exposes `findAll`, `textOf`,
  `paragraphs`, `tables`, `sections`, `styleIds`, `fieldCodesOf`).

## Development

Node 24 (the current LTS) for development: `.nvmrc` pins the major, and
`engines.node` records the `>=22.12.0` floor the package itself needs. Only the
`.nvmrc` version is exercised by the test suite.

```sh
pnpm build        # clean, vite build, emit types, then link:push
pnpm dev          # the same, on watch via nodemon
pnpm build:src    # vite build only
pnpm build:types  # declaration emit only
pnpm storybook    # storybook dev server (STORYBOOK_PORT, default 3000)
pnpm link:push    # clean-publish into ./publish and `yalc push` it
```

`vite.config.ts` builds the library in lib mode, ESM and CJS, one chunk set per
entry point. Which modules stay unbundled is declared in that config:
`build.rolldownOptions.external` reads `package.json` and externalises every
name in `dependencies` and `peerDependencies` — bare and subpath alike, so
`lodash/merge` and `react/jsx-runtime` are covered — plus every Node builtin
with and without the `node:` prefix. `devDependencies` are deliberately absent,
so build-time-only code is bundled. Adding a runtime dependency therefore needs
no config change. (This replaces `rollup-plugin-node-externals`, whose v9
requires Node 24.)

`bundler/` holds the `?source` loader. An import whose specifier ends in
`?source` — `src/parsers/script/htmlToScript.ts` imports `../dom?source` — is
replaced by the fully bundled, minified CJS of that module as a string literal,
which `reactToScript` and `reactToPdf` evaluate inside the page. The nested
bundle runs once per output format; a `load` hook filter keeps Rolldown from
calling into the plugin for every other module in the graph.

`src/demo/` holds full documents built to `dist-demo/` in every target;
`src/demo.test.ts` runs that build and asserts nothing errored.

### Type checking and linting

TypeScript is installed twice, because TypeScript 7 is the native compiler and
ships no JavaScript compiler API:

- `typescript-native` is an alias for the real `typescript` package (7.x). It
  owns the `tsc` binary, so `pnpm typecheck` and `pnpm build:types` compile with
  TypeScript 7.
- `typescript` is an alias for `@typescript/typescript6`, Microsoft's
  side-by-side release of the 6.x JavaScript API. Everything that resolves
  `typescript` — typescript-eslint, Storybook's docgen, an editor's tsserver —
  gets that API, and typescript-eslint's `typescript >=4.8.4 <6.1.0` peer range
  is satisfied. Its binary is `tsc6`, so it never shadows `tsc`.

Nothing in `.vscode/settings.json` selects a compiler, so an editor resolves
`typescript` and keeps using the 6.x language service while the published
`dist/*.d.ts` come from 7. The declaration output of the two agrees except for
quoting (`'a'` against `"a"`), the order of union members, and a redundant
`| undefined` on optional properties that 7 omits.

Linting is ESLint 10 flat config (`eslint.config.js`) with `typescript-eslint`,
`eslint-plugin-react`, `eslint-plugin-react-hooks` and
`eslint-plugin-import-x` — the fork of `eslint-plugin-import` that runs on
ESLint 10, where the original calls the removed `context.parserOptions`. Every
rule kept its name and severity under the `import-x/` prefix. Two settings carry
weight:

- `import-x/extensions` lists the TypeScript extensions. Left at the default the
  plugin follows only `.js`/`.mjs`/`.cjs`, which is why `no-cycle`, `default`
  and `export` used to analyse nothing here.
- `import-x/resolver-next` runs `createTypeScriptImportResolver` and import-x's
  own node resolver, each wrapped so a specifier carrying a bundler query
  (`../dom?source`) is reported unresolved rather than silently resolving to
  `../dom`, whose exports are unrelated. `import-x/no-unresolved` exempts that
  form.

`react-hooks` stays limited to `rules-of-hooks` and `exhaustive-deps`: the React
Compiler rules that v7 folded into `recommended` are a separate decision and are
not enabled.
