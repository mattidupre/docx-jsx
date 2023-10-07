import { Store } from 'src/lib/store';

export const useIsDocX = () => {
  return Store.getIsRendering();
};
