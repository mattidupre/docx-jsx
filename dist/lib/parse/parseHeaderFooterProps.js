import { mapObjectValues } from 'src/utils';
export const parseHeaderFooterProps = ({ headers, footers }, renderChild) => ({
    headers: mapObjectValues(headers ?? {}, (_, header) => renderChild(header, ['header'])),
    footers: mapObjectValues(footers ?? {}, (_, footer) => renderChild(footer, ['footer'])),
});
//# sourceMappingURL=parseHeaderFooterProps.js.map