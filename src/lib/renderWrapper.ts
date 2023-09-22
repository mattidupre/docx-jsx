/* eslint-disable no-multi-assign */
type OnRenderedCallback = () => void;
type RenderState = any;
type RenderContext = {
  renderStates?: Map<unknown, RenderState>;
  onRenderedCallbacks?: Array<OnRenderedCallback>;
};
const renderContexts: Array<RenderContext> = [];
let currentRenderId = -1;

const isRendering = () => currentRenderId !== -1;

const resetRenderContexts = () => {
  renderContexts.length = 0;
  currentRenderId = -1;
};

export const useSetRenderState = <TValue extends RenderState>(
  key: any,
  value: TValue,
) => {
  const currentContext = (renderContexts[currentRenderId] ??= {});
  const renderStates = (currentContext.renderStates ??= new Map());
  if (renderStates.has(key)) {
    throw new Error(
      `Render state already set in this component for key "${JSON.stringify(
        key,
      )}".`,
    );
  }
  renderStates.set(key, value);
};

export const useGetRenderState = <TValue extends RenderState>(
  key: any,
  renderId: number = currentRenderId,
): undefined | TValue => {
  const renderStates = renderContexts[renderId]?.renderStates;
  if (renderStates?.has(key)) {
    return renderStates.get(key);
  }
  return undefined;
};

export const usePrevRenderState = <TValue extends RenderState>(
  key: any,
): undefined | TValue => {
  const startRenderId = currentRenderId - 1; // Ignore current render key.
  for (let i = startRenderId; i >= 0; i -= 1) {
    const renderStates = renderContexts[i]?.renderStates;
    if (renderStates?.has(key)) {
      return renderStates.get(key);
    }
  }
  return undefined;
};

export const useOnRenderedCallback = <TCallback extends OnRenderedCallback>(
  callback: TCallback,
) => {
  const currentContext = (renderContexts[currentRenderId] ??= {});
  const onRenderedCallbacks = (currentContext.onRenderedCallbacks ??= []);
  onRenderedCallbacks.push(callback);
};

export const renderComponentWrapper = <
  TFn extends (...args: ReadonlyArray<any>) => any,
>(
  renderFn: TFn,
): ReturnType<TFn> => {
  currentRenderId += 1;
  let result: ReturnType<TFn>;
  try {
    result = renderFn();
    renderContexts[currentRenderId]?.onRenderedCallbacks?.forEach((callback) =>
      callback(),
    );
  } finally {
    delete renderContexts[currentRenderId];
    currentRenderId -= 1;
  }
  return result;
};

export const renderDocumentWrapper = <
  TFn extends (...args: ReadonlyArray<any>) => any,
>(
  renderFn: TFn,
): ReturnType<TFn> => {
  if (isRendering()) {
    throw new Error('Do not render multiple documents at once.');
  }
  let result: ReturnType<TFn>;
  try {
    result = renderFn();
  } finally {
    resetRenderContexts();
  }
  return result;
};
