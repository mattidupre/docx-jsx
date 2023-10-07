/* eslint-disable no-multi-assign */

type Value<T = any> = Readonly<{ value: T }>;
type Values = WeakMap<any, Value>;
type Callback = () => void;
type Callbacks = Array<Callback>;

// rename to Store.initRoot and Store.initComponent

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

export class Store {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected constructor() {}

  protected static isGlobalRendering = false;

  protected static globalValues: Values = new WeakMap();

  protected static globalCallbacks: Callbacks = [];

  protected static nodeValues: Array<Values> = [];

  protected static nodeCallbacks: Array<Callbacks> = [];

  protected static currentNodeIndex = -1;

  public static initGlobal() {
    if (Store.isGlobalRendering) {
      throw new Error('Do not use multiple renderers at once.');
    }
    Store.clearGlobal();
    Store.isGlobalRendering = true;
  }

  public static getIsRendering() {
    return Store.isGlobalRendering;
  }

  public static setGlobalValue(key: any, value: any) {
    setMapValue(Store.globalValues, key, value);
  }

  public static getGlobalValue<T>(key: any) {
    return getMapValue<T>(Store.globalValues, key);
  }

  public static addGlobalCallback(callback: Callback) {
    Store.checkIfGlobalRendering();
    Store.globalCallbacks.push(callback);
  }

  public static removeGlobalCallback(callback: Callback) {
    Store.checkIfGlobalRendering();
    removeCallback(Store.globalCallbacks, callback);
  }

  public static initNode() {
    Store.checkIfGlobalRendering();
    Store.currentNodeIndex += 1;
  }

  public static setNodeValue(key: any, value: any) {
    Store.checkIfGlobalRendering();
    const nodeValues = (Store.nodeValues[Store.currentNodeIndex] ??= new Map());
    setMapValue(nodeValues, key, value);
  }

  public static getLastNodeValue<T>(key: any) {
    Store.checkIfGlobalRendering();
    return findLastFrom(
      Store.nodeValues,
      Store.currentNodeIndex,
      (map) => map?.has(key),
    )?.get(key) as undefined | Value<T>;
  }

  public static addNodeCallback(callback: Callback) {
    Store.checkIfGlobalRendering();
    const nodeValues = (Store.nodeCallbacks[Store.currentNodeIndex] ??= []);
    nodeValues.push(callback);
  }

  public static removeNodeCallback(callback: Callback) {
    Store.checkIfGlobalRendering();
    removeCallback(Store.nodeCallbacks[Store.currentNodeIndex], callback);
  }

  public static completeNode() {
    Store.checkIfGlobalRendering();
    Store.callNodeCallbacks();
    Store.clearNode();
  }

  public static clearNode() {
    Store.nodeValues.splice(Store.currentNodeIndex);
    Store.nodeCallbacks.splice(Store.currentNodeIndex);
    Store.currentNodeIndex -= 1;
  }

  public static completeGlobal() {
    Store.callGlobalCallbacks();
    Store.clearGlobal();
  }

  public static clearGlobal() {
    Store.isGlobalRendering = false;
    Store.globalCallbacks.splice(0);

    Store.nodeValues.splice(0);
    Store.nodeCallbacks.splice(0);
    Store.currentNodeIndex = -1;
  }

  protected static callGlobalCallbacks() {
    Store.checkIfGlobalRendering();
    Store.globalCallbacks.forEach((callback) => callback());
  }

  protected static callNodeCallbacks() {
    Store.checkIfGlobalRendering();
    Store.nodeCallbacks[Store.currentNodeIndex]?.forEach((callback) =>
      callback(),
    );
  }

  protected static checkIfGlobalRendering() {
    if (Store.isGlobalRendering !== true) {
      throw new Error('Document is not currently rendering.');
    }
  }
}
