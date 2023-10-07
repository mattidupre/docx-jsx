import { Store } from 'src/lib/store';

export const useIsReact = () => !Store.getIsRendering();
