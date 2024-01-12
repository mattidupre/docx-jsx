import { useEnvironment } from './useEnvironment';
import { InternalElement } from './InternalElement';

export function PageNumber() {
  if (useEnvironment({ disableAssert: true }).documentType === 'web') {
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
