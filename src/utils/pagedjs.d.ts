declare module 'pagedjs' {
  type ChunkerInstance = {
    flow: (content: Node, renderTo: Node) => Promise<ChunkerInstance>;
    on: (event: 'page', callback: (value: any) => void) => void;
  };

  export const Chunker: new () => ChunkerInstance;
}
