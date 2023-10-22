import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
export function Footer({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('footer', options, ...Children.toArray(children));
    }
    return children;
}
//# sourceMappingURL=Footer.js.map