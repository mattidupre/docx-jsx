import { useOnRenderedCallback } from './renderWrapper';

export const useEffect = (callback: () => void | { (): void }) => {
  useOnRenderedCallback(callback);
};
