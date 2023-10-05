import { mockDocumentElement } from 'src/helpers';
import { createRenderer } from './lib/createRenderer';
import { it } from 'vitest';

it('does not error', () => {
  console.log(
    createRenderer('document', ({ type, props }, { renderChildren }) => {
      if (type === 'document') {
        return { sections: renderChildren(props.sections, ['section']) };
      }
      return {
        children: renderChildren(props.children, ['paragraph', 'textrun']),
      };
    })(mockDocumentElement),
  );
});
