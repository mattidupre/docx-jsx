import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'src/react';
import { DEFAULT_TEXT_CONFIG, extendTextConfig, } from '../entities';
const TextContext = createContext(DEFAULT_TEXT_CONFIG);
export const useTextConfig = (options) => {
    const prevConfig = useContext(TextContext);
    const config = useMemo(() => (options ? extendTextConfig(prevConfig, options) : prevConfig), [prevConfig, options]);
    return config;
};
export function TextProvider({ options, children }) {
    const value = useTextConfig(options);
    return _jsx(TextContext.Provider, { value: value, children: children });
}
TextProvider.defaultProps = {
    children: null,
};
//# sourceMappingURL=TextProvider.js.map