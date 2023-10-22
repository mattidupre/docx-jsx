import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
export function PagesGroup({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('section', options, ...Children.toArray(children));
    }
    return children;
}
//# sourceMappingURL=PagesGroup.js.map