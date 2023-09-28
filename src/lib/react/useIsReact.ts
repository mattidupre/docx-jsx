import { Store } from 'src/lib/renderer';

export const useIsReact = () => !Store.getIsRendering();
