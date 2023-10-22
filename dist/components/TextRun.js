import { jsx as _jsx } from "react/jsx-runtime";
import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
export function TextRun({ children, ...options }) {
    if (useIsDocX()) {
        return createElement('textrun', options, ...Children.toArray(children));
    }
    return _jsx("span", { children: children });
}
//# sourceMappingURL=TextRun.js.map