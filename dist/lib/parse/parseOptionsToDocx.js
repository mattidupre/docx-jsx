import { Header, Footer, Paragraph, TextRun, Table, Document } from 'docx';
import { defineParser } from './createParser';
// TODO: Why is children always never?
export const parseOptionsToDocx = defineParser({
    document: ({ children, ...options }) => new Document({ ...options, sections: children }),
    pagesGroup: (options) => options,
    header: (options) => new Header(options),
    footer: (options) => new Footer(options),
    paragraph: (options) => new Paragraph(options),
    textrun: ({ children, ...options }) => {
        console.log('HERE', options); // TODO: Why does this fire with {}?
        return new TextRun({ ...options, children: children?.length || undefined });
    },
    table: (options) => new Table(options),
});
//# sourceMappingURL=parseOptionsToDocx.js.map