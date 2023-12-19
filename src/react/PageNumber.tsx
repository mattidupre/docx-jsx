import { useEnvironment } from './useEnvironment';
import { InternalElement } from './InternalElement.js';

export function PageNumber() {
  if (useEnvironment().documentType === 'web') {
    console.warn('PageCount will be ignored in web output.');
  }

  return (
    <InternalElement
      tagName="span"
      elementType="pagenumber"
      elementOptions={{}}
    />
  );
}
