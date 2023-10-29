declare module 'pagedjs' {
  export class Handler {}
  export class Previewer {
    preview: (...args: any) => any;
  }
  export const registerHandlers: (...args: ReadonlyArray<Handler>) => void;
}
