import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
export function Paragraph({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('paragraph', options, ...Children.toArray(children));
    }
    return children;
}
//# sourceMappingURL=Paragraph.js.map