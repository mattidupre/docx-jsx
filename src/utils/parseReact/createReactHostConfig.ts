import type ReactReconciler from 'react-reconciler';
import { type SetRequired } from 'type-fest';

type HostConfig<TContext = unknown> = ReactReconciler.HostConfig<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  TContext,
  any,
  any,
  any,
  any
>;

const throwIfInvoked = () => {
  throw new Error(
    [
      'Unused Renderer method called.',
      'If encountering this, ReactReconciler hostConfig needs to be updated.',
    ].join(' '),
  );
};

const BASE_HOST_CONFIG = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  resetAfterCommit: () => {},
  resetTextContent: () => {},
  prepareUpdate: () => true,
  detachDeletedInstance: () => {},
  removeChildFromContainer: () => {},
  getPublicInstance: (instance) => instance,
  shouldSetTextContent: () => false,
  appendChild: throwIfInvoked,
  commitUpdate: throwIfInvoked,
  commitTextUpdate: throwIfInvoked,
  removeChild: throwIfInvoked,
  clearContainer: () => {},
  prepareForCommit: () => null,
  getChildHostContext: (prevContext) => prevContext,
  getRootHostContext: () => null,
} as const satisfies Partial<HostConfig>;

export const createReactHostConfig = <TContext>(
  config: SetRequired<
    Partial<HostConfig<TContext>>,
    | 'createInstance'
    | 'createTextInstance'
    | 'appendInitialChild'
    | 'appendChildToContainer'
  >,
) =>
  ({
    ...BASE_HOST_CONFIG,
    ...config,
  }) as HostConfig<TContext>;
