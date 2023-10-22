import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
export function Header({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('header', options, ...Children.toArray(children));
    }
    return children;
}
//# sourceMappingURL=Header.js.map