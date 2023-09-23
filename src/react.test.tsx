import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextRun, Paragraph, Section } from './components/docXPrimitives';
import DX from '.';

const ReactComponent = function () {
  return <TextRun>Success!</TextRun>;
};

test('renders to react', async () => {
  console.log('begin render');
  console.log(renderToStaticMarkup(<ReactComponent />));
  console.log('end render');
});
