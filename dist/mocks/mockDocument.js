import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/* eslint-disable react/jsx-no-useless-fragment */
import { Document, PagesGroup, Header, TextRun, Paragraph, } from 'src/components';
import { TextProvider, useTextConfig } from 'src/context';
import { vi } from 'vitest';
const componentElements = new Map();
const createMockComponent = (component) => vi.fn((...args) => {
    // eslint-disable-next-line prefer-spread
    const value = component.apply(undefined, args);
    componentElements.set(component, value);
    return value;
});
const ColorString = createMockComponent(() => {
    return useTextConfig().color.toUpperCase();
});
const ComponentD = createMockComponent(() => {
    return (_jsxs(_Fragment, { children: [_jsx(TextRun, { children: "Component D 1" }), _jsx(TextRun, { children: "Component D 2" })] }));
});
const ComponentB = createMockComponent(() => {
    return (_jsx(_Fragment, { children: _jsxs(TextProvider, { options: { color: 'red' }, children: [_jsxs(Paragraph, { children: [_jsx(ColorString, {}), _jsx(TextRun, { children: "COMPONENT 1" }), _jsx(TextRun, { children: 0 })] }), _jsx(Paragraph, { children: "EXTRA" })] }) }));
});
const ComponentA = createMockComponent(() => {
    return (_jsxs(_Fragment, { children: [_jsx(Paragraph, { children: "NO TEXTRUN" }), _jsx(Paragraph, { text: "WEIRD" }), _jsx(ComponentB, {}), _jsx(Paragraph, { text: "WEIRD" }), _jsxs(Paragraph, { children: [_jsx(TextRun, { children: "THREE" }), _jsx(ComponentD, {})] })] }));
});
export const mockDocumentElement = (_jsx(Document, { children: _jsx(PagesGroup, { headers: {
            default: (_jsx(Header, { children: _jsx(Paragraph, { children: "HEADER TEXT" }) })),
        }, children: _jsx(ComponentA, {}) }) }));
//# sourceMappingURL=mockDocument.js.map