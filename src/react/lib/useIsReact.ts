import { Store } from 'src/render';

export const useIsReact = () => !Store.getIsRendering();
