import { mapObjectValues } from 'src/utils';
export const parsePagesGroupProps = ({ children, headers, footers }, { renderChild, renderChildren }) => {
    return {
        children: renderChildren(children, ['paragraph', 'table']),
        headers: mapObjectValues(headers ?? {}, (_, header) => renderChild(header, ['header'])),
        footers: mapObjectValues(footers ?? {}, (_, footer) => renderChild(footer, ['footer'])),
    };
};
//# sourceMappingURL=parsePagesGroupProps.js.map