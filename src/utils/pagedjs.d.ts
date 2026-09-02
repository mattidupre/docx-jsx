/**
 * pagedjs ships no types. Declared here are only the members `utils/pager.ts`
 * actually uses: the chunker, the two layout hooks it registers on, and the
 * break token it reads. Anything else stays undeclared on purpose, so reaching
 * for more of pagedjs is a deliberate addition rather than an accident.
 */
declare module 'pagedjs' {
  /** The page pagedjs is about to lay out, or has just laid out. */
  type ChunkerPage = {
    /**
     * The `.pagedjs_page` element. Page-scoped custom properties are set on it,
     * which is how a page is given its own size and margins.
     */
    element: HTMLElement;
  };

  /**
   * Where the chunker stopped: the node the next page resumes at, which is a
   * text node when a page ends part way through a run of text. It is absent on
   * the last page, where nothing is left to resume.
   */
  type BreakToken = {
    node?: HTMLElement | Text;
  };

  type ChunkerHook<TCallback> = {
    register: (callback: TCallback) => void;
  };

  type ChunkerInstance = {
    flow: (content: Node, renderTo: Node) => Promise<ChunkerInstance>;
    hooks: {
      beforePageLayout: ChunkerHook<
        (page: ChunkerPage) => void | Promise<void>
      >;
      afterPageLayout: ChunkerHook<
        (
          pageElement: HTMLElement,
          page: ChunkerPage,
          breakToken: undefined | BreakToken,
        ) => void
      >;
    };
    destroy: () => void;
  };

  export const Chunker: new () => ChunkerInstance;
}
