import { useEnvironment } from './useEnvironment';
import { InternalElement } from './InternalElement';

export function PageCount() {
  if (useEnvironment().documentType === 'web') {
    console.warn('PageCount will be ignored in web output.');
  }

  return (
    <InternalElement
      tagName="span"
      elementType="pagecount"
      elementOptions={{}}
    />
  );
}
