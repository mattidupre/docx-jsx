import { createElement } from 'react';
import { useIsDocX } from 'src/react';
export function Document({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('document', { ...options }, children);
    }
    return children;
}
//# sourceMappingURL=Document.js.map