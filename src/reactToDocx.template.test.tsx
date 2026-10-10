import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import { DocumentProvider, Stack, Typography } from './reactComponents';
import { inspectDocx, sections, textOf } from './fixtures/docxInspect';
import { patchPackedDocx } from './parsers/docx/patchPackedDocx';
import { writeTestFile } from './fixtures/writeTestFile';

const DOCUMENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const TEMPLATE_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml';

const Report = ({ content }: { content: string }) => (
  <DocumentProvider variants={{ heading1: { color: '#123456' } }}>
    <Stack
      margin={{ top: '1in', bottom: '1in' }}
      layouts={{
        first: {},
        subsequent: {
          header: <Typography as="p">Report header</Typography>,
          footer: <Typography as="p">Report footer</Typography>,
        },
      }}
    >
      <Typography as="h1" variant="heading1">
        Report
      </Typography>
      <Typography as="p">{content}</Typography>
    </Stack>
  </DocumentProvider>
);

const StarterReport = () => <Report content="Write your summary here." />;
const FilledReport = () => <Report content="Revenue increased by 10%." />;

const contentTypes = async (buffer: Buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file('[Content_Types].xml');
  if (!part) throw new Error('Missing content types');
  return part.async('string');
};

describe('Word template export', () => {
  it('defaults to DOCX and supports explicit DOCX and DOTX packaging', async () => {
    for (const fileType of [undefined, 'docx', 'dotx'] as const) {
      const buffer = await reactToDocx(StarterReport, { fileType });
      const xml = await contentTypes(buffer);
      expect(xml).toContain(
        fileType === 'dotx' ? TEMPLATE_TYPE : DOCUMENT_TYPE,
      );
      expect(xml).not.toContain(
        fileType === 'dotx' ? DOCUMENT_TYPE : TEMPLATE_TYPE,
      );
    }
  });

  it('changes only the main content type when packaging the same document', async () => {
    const document = await reactToDocx(StarterReport, {});
    const template = await patchPackedDocx(document, {
      fileType: 'dotx',
      widowControl: true,
      sumAdjacentMargins: false,
      embeddedFonts: [],
    });
    const docx = await JSZip.loadAsync(document);
    const dotx = await JSZip.loadAsync(template);
    expect(Object.keys(dotx.files).sort()).toEqual(
      Object.keys(docx.files).sort(),
    );
    for (const [path, part] of Object.entries(docx.files)) {
      if (part.dir) continue;
      const templatePart = dotx.file(path);
      expect(templatePart, path).not.toBeNull();
      if (path === '[Content_Types].xml') {
        expect(await templatePart?.async('string')).toBe(
          (await part.async('string')).replace(DOCUMENT_TYPE, TEMPLATE_TYPE),
        );
      } else {
        expect(await templatePart?.async('uint8array'), path).toEqual(
          await part.async('uint8array'),
        );
      }
    }
  });

  it('preserves shared styles and layout with distinct starter and populated content', async () => {
    const starterBuffer = await reactToDocx(StarterReport, {
      fileType: 'dotx',
    });
    const filledBuffer = await reactToDocx(FilledReport, {});
    await writeTestFile('report-starter.dotx', starterBuffer);
    await writeTestFile('report-filled.docx', filledBuffer);
    const starter = await inspectDocx(starterBuffer);
    const filled = await inspectDocx(filledBuffer);
    expect(textOf(starter.document)).toContain('Write your summary here.');
    expect(textOf(starter.document)).not.toContain('Revenue increased');
    expect(textOf(filled.document)).toContain('Revenue increased by 10%.');
    expect(textOf(filled.document)).not.toContain('Write your summary');
    expect(starter.styles).toEqual(filled.styles);
    expect(sections(starter.document)).toEqual(sections(filled.document));
    expect(starter.headers).toEqual(filled.headers);
    expect(starter.footers).toEqual(filled.footers);
    expect(starter.headers.map(textOf)).toContain('Report header');
    expect(starter.footers.map(textOf)).toContain('Report footer');
  });

  it.each(['missing', 'unexpected'])(
    'rejects a %s main content-type override',
    async (kind) => {
      const buffer = await reactToDocx(StarterReport, {});
      const zip = await JSZip.loadAsync(buffer);
      zip.file(
        '[Content_Types].xml',
        (await contentTypes(buffer)).replace(
          kind === 'missing' ? '/word/document.xml' : DOCUMENT_TYPE,
          kind === 'missing' ? '/word/absent.xml' : 'unexpected/type',
        ),
      );
      await expect(
        patchPackedDocx(await zip.generateAsync({ type: 'nodebuffer' }), {
          fileType: 'dotx',
          widowControl: true,
          sumAdjacentMargins: false,
          embeddedFonts: [],
        }),
      ).rejects.toThrow(
        'Expected the DOCX main document content-type override.',
      );
    },
  );
});
