import { isRendering } from './renderWrapper';

export const useIsReact = () => !isRendering();
