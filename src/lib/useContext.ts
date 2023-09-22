import { usePrevRenderState } from './renderWrapper';
import { type Context } from './createContext';

export const useContext = <TContext extends Context>(
  context: TContext,
): Context['defaultValue'] =>
  usePrevRenderState(context) ?? context.defaultValue;
