declare module 'pagedjs' {
  type ChunkerInstance = {
    flow: (content: Node, renderTo: Node) => Promise<ChunkerInstance>;
    hooks: {
      beforePageLayout: {
        register: (callback: (page: any) => void) => void;
      };
      afterPageLayout: {
        register: (
          callback: (
            pageEl: HTMLElement,
            page: any,
            breakToken: { node?: HTMLNode },
          ) => void,
        ) => void;
      };
    };
    destroy: () => void;
  };

  export const Chunker: new () => ChunkerInstance;
}
