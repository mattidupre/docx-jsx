import { Store } from 'src/lib/render';

export const useIsReact = () => !Store.getIsRendering();
