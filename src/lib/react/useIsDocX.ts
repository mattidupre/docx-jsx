import { DispatcherStore } from 'src/lib/dispatcher';

export const useIsDocX = () =>
  DispatcherStore.getRenderEnvironment() === 'docx';
