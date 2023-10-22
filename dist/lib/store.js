/* eslint-disable no-multi-assign */
// rename to Store.initRoot and Store.initComponent
const setMapValue = (map, key, value) => {
    if (map.has(key)) {
        throw new Error(`Value already exists.`);
    }
    map.set(key, { value });
};
const getMapValue = (map, key) => map.get(key);
const removeCallback = (callbacks, callback) => {
    callbacks?.splice(callbacks.indexOf(callback), 1);
};
const findLastFrom = (arr, index, callback) => {
    for (let i = index; i >= 0; i -= 1) {
        if (callback(arr[i])) {
            return arr[i];
        }
    }
    return undefined;
};
export class Store {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() { }
    static isGlobalRendering = false;
    static globalValues = new WeakMap();
    static globalCallbacks = [];
    static nodeValues = [];
    static nodeCallbacks = [];
    static currentNodeIndex = -1;
    static initGlobal() {
        if (Store.isGlobalRendering) {
            throw new Error('Do not use multiple renderers at once.');
        }
        Store.clearGlobal();
        Store.isGlobalRendering = true;
    }
    static getIsRendering() {
        return Store.isGlobalRendering;
    }
    static setGlobalValue(key, value) {
        setMapValue(Store.globalValues, key, value);
    }
    static getGlobalValue(key) {
        return getMapValue(Store.globalValues, key);
    }
    static addGlobalCallback(callback) {
        Store.checkIfGlobalRendering();
        Store.globalCallbacks.push(callback);
    }
    static removeGlobalCallback(callback) {
        Store.checkIfGlobalRendering();
        removeCallback(Store.globalCallbacks, callback);
    }
    static initNode() {
        Store.checkIfGlobalRendering();
        Store.currentNodeIndex += 1;
    }
    static setNodeValue(key, value) {
        Store.checkIfGlobalRendering();
        const nodeValues = (Store.nodeValues[Store.currentNodeIndex] ??= new Map());
        setMapValue(nodeValues, key, value);
    }
    static getLastNodeValue(key) {
        Store.checkIfGlobalRendering();
        return findLastFrom(Store.nodeValues, Store.currentNodeIndex, (map) => map?.has(key))?.get(key);
    }
    static addNodeCallback(callback) {
        Store.checkIfGlobalRendering();
        const nodeValues = (Store.nodeCallbacks[Store.currentNodeIndex] ??= []);
        nodeValues.push(callback);
    }
    static removeNodeCallback(callback) {
        Store.checkIfGlobalRendering();
        removeCallback(Store.nodeCallbacks[Store.currentNodeIndex], callback);
    }
    static completeNode() {
        Store.checkIfGlobalRendering();
        Store.callNodeCallbacks();
        Store.clearNode();
    }
    static clearNode() {
        Store.nodeValues.splice(Store.currentNodeIndex);
        Store.nodeCallbacks.splice(Store.currentNodeIndex);
        Store.currentNodeIndex -= 1;
    }
    static completeGlobal() {
        Store.callGlobalCallbacks();
        Store.clearGlobal();
    }
    static clearGlobal() {
        Store.isGlobalRendering = false;
        Store.globalCallbacks.splice(0);
        Store.nodeValues.splice(0);
        Store.nodeCallbacks.splice(0);
        Store.currentNodeIndex = -1;
    }
    static callGlobalCallbacks() {
        Store.checkIfGlobalRendering();
        Store.globalCallbacks.forEach((callback) => callback());
    }
    static callNodeCallbacks() {
        Store.checkIfGlobalRendering();
        Store.nodeCallbacks[Store.currentNodeIndex]?.forEach((callback) => callback());
    }
    static checkIfGlobalRendering() {
        if (Store.isGlobalRendering !== true) {
            throw new Error('Document is not currently rendering.');
        }
    }
}
//# sourceMappingURL=store.js.map