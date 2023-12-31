import type { ReactNode } from 'react';
import { isMatch } from 'lodash';
import type { ReactEnvironmentContextValue } from './entities';
import { useEnvironment } from './useEnvironment';

export type IfEnvironmentProps = Partial<ReactEnvironmentContextValue> & {
  not?: boolean;
  children: ReactNode;
};

export function IfEnvironment({ children, not, ...props }: IfEnvironmentProps) {
  const environment = useEnvironment({ disableAssert: true });
  const isEnvironment = isMatch(environment, props);
  if (not ? !isEnvironment : isEnvironment) {
    return children;
  }
  return null;
}
