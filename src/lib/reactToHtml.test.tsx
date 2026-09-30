import { describe, expect, it } from 'vitest';
import { DocumentProvider } from '../reactComponents/DocumentProvider';
import { Image } from '../reactComponents/Image';
import { Stack } from '../reactComponents/Stack';
import { reactToHtml } from './reactToHtml';

describe('reactToHtml', () => {
  it('drops the image preloads React hoists ahead of the document root', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider>
          <Stack>
            <Image src="/first.png" alt="First" width="1in" />
            <Image src="/second.png" alt="Second" width="1in" />
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    expect(html).toMatch(/^<div /);
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain('src="/first.png"');
    expect(html).toContain('src="/second.png"');
  });
});
