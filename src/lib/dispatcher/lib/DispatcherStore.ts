/* eslint-disable no-multi-assign */

type RenderEnvironment = string;
type Value<T = any> = Readonly<{ value: T }>;
type Values = WeakMap<any, Value>;
type Callback = () => void;
type Callbacks = Array<Callback>;

const setMapValue = (map: WeakMap<any, Value>, key: any, value: any) => {
  if (map.has(key)) {
    throw new Error(`Value already exists.`);
  }
  map.set(key, { value });
};

const getMapValue = <T>(map: WeakMap<any, any>, key: any) =>
  map.get(key) as undefined | { value: T };

const removeCallback = (
  callbacks: undefined | Callbacks,
  callback: Callback,
) => {
  callbacks?.splice(callbacks.indexOf(callback), 1);
};

const findLastFrom = <TValue>(
  arr: ReadonlyArray<TValue>,
  index: number,
  callback: (value: TValue) => boolean,
): undefined | TValue => {
  for (let i = index; i >= 0; i -= 1) {
    if (callback(arr[i])) {
      return arr[i];
    }
  }
  return undefined;
};

export class DispatcherStore {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected constructor() {}

  protected static isGlobalRendering = false;

  protected static renderEnvironment: null | RenderEnvironment = null;

  protected static globalValues: Values = new WeakMap();

  protected static globalCallbacks: Callbacks = [];

  protected static nodeValues: Array<Values> = [];

  protected static nodeCallbacks: Array<Callbacks> = [];

  protected static currentNodeIndex = -1;

  public static initGlobal(renderEnvironment: RenderEnvironment) {
    if (DispatcherStore.isGlobalRendering) {
      throw new Error('Do not use multiple renderers at once.');
    }
    DispatcherStore.clearGlobal();
    DispatcherStore.renderEnvironment = renderEnvironment;
    DispatcherStore.isGlobalRendering = true;
  }

  public static getRenderEnvironment() {
    return DispatcherStore.renderEnvironment;
  }

  public static setGlobalValue(key: any, value: any) {
    setMapValue(DispatcherStore.globalValues, key, value);
  }

  public static getGlobalValue<T>(key: any) {
    return getMapValue<T>(DispatcherStore.globalValues, key);
  }

  public static addGlobalCallback(callback: Callback) {
    DispatcherStore.checkIfGlobalRendering();
    DispatcherStore.globalCallbacks.push(callback);
  }

  public static removeGlobalCallback(callback: Callback) {
    DispatcherStore.checkIfGlobalRendering();
    removeCallback(DispatcherStore.globalCallbacks, callback);
  }

  public static initNode(renderEnvironment: RenderEnvironment) {
    DispatcherStore.checkIfGlobalRendering();
    if (renderEnvironment !== DispatcherStore.renderEnvironment) {
      throw new Error(
        `Invalid Node Render Environment: "${renderEnvironment}".`,
      );
    }
    DispatcherStore.currentNodeIndex += 1;
  }

  public static setNodeValue(key: any, value: any) {
    DispatcherStore.checkIfGlobalRendering();
    const nodeValues = (DispatcherStore.nodeValues[
      DispatcherStore.currentNodeIndex
    ] ??= new Map());
    setMapValue(nodeValues, key, value);
  }

  public static getLastNodeValue<T>(key: any) {
    DispatcherStore.checkIfGlobalRendering();
    return findLastFrom(
      DispatcherStore.nodeValues,
      DispatcherStore.currentNodeIndex,
      (map) => map?.has(key),
    )?.get(key) as undefined | Value<T>;
  }

  public static addNodeCallback(callback: Callback) {
    DispatcherStore.checkIfGlobalRendering();
    const nodeValues = (DispatcherStore.nodeCallbacks[
      DispatcherStore.currentNodeIndex
    ] ??= []);
    nodeValues.push(callback);
  }

  public static removeNodeCallback(callback: Callback) {
    DispatcherStore.checkIfGlobalRendering();
    removeCallback(
      DispatcherStore.nodeCallbacks[DispatcherStore.currentNodeIndex],
      callback,
    );
  }

  public static completeNode() {
    DispatcherStore.checkIfGlobalRendering();
    DispatcherStore.callNodeCallbacks();
    DispatcherStore.clearNode();
  }

  public static clearNode() {
    DispatcherStore.nodeValues.splice(DispatcherStore.currentNodeIndex);
    DispatcherStore.nodeCallbacks.splice(DispatcherStore.currentNodeIndex);
    DispatcherStore.currentNodeIndex -= 1;
  }

  public static completeGlobal() {
    DispatcherStore.callGlobalCallbacks();
    DispatcherStore.clearGlobal();
  }

  public static clearGlobal() {
    DispatcherStore.isGlobalRendering = false;
    DispatcherStore.renderEnvironment = null;
    // DispatcherStore.globalValues.clear();
    DispatcherStore.globalCallbacks.splice(0);

    DispatcherStore.nodeValues.splice(0);
    DispatcherStore.nodeCallbacks.splice(0);
    DispatcherStore.currentNodeIndex = -1;
  }

  protected static callGlobalCallbacks() {
    DispatcherStore.checkIfGlobalRendering();
    DispatcherStore.globalCallbacks.forEach((callback) => callback());
  }

  protected static callNodeCallbacks() {
    DispatcherStore.checkIfGlobalRendering();
    DispatcherStore.nodeCallbacks[DispatcherStore.currentNodeIndex]?.forEach(
      (callback) => callback(),
    );
  }

  protected static checkIfGlobalRendering() {
    if (DispatcherStore.isGlobalRendering !== true) {
      throw new Error('Document is not currently rendering.');
    }
  }
}
