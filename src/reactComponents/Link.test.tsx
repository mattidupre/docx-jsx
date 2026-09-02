import { describe, expect, test } from 'vitest';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { Bookmark, Link } from './Link';

const render = (children: React.ReactNode) =>
  reactToHtml(() => <ContentProvider>{children}</ContentProvider>, 'web');

describe('Bookmark', () => {
  test('renders the target an internal link resolves against', () => {
    const html = render(<Bookmark id="cetology">Cetology</Bookmark>);
    expect(html.startsWith('<a id="cetology"')).toBe(true);
    expect(html.endsWith('>Cetology</a>')).toBe(true);
    // A bookmark is a target, not a link, so it never gets an href.
    expect(html).not.toContain('href');
  });
});

describe('Link', () => {
  test('links to an external target as it was given', () => {
    expect(render(<Link href="https://example.com/">Example</Link>)).toContain(
      'href="https://example.com/"',
    );
  });

  test('links to a bookmark as a fragment', () => {
    expect(render(<Link bookmark="cetology">Cetology</Link>)).toContain(
      'href="#cetology"',
    );
    expect(render(<Link to="#cetology">Cetology</Link>)).toContain(
      'href="#cetology"',
    );
  });

  test('applies its typography options and variant', () => {
    const html = render(
      <Link href="https://example.com/" fontWeight="bold">
        Bold link
      </Link>,
    );
    expect(html).toContain('font-weight:bold');
  });

  test('rejects a target it cannot resolve', () => {
    expect(() => render(<Link>No target</Link>)).toThrow(
      /exactly one of href, to, bookmark/,
    );
    expect(() =>
      render(
        <Link href="https://example.com/" bookmark="cetology">
          Two targets
        </Link>,
      ),
    ).toThrow(/exactly one of href, to, bookmark/);
  });

  test('rejects a "to" that does not point inside the document', () => {
    expect(() =>
      render(<Link to="https://example.com/">Outside</Link>),
    ).toThrow(/must begin with "#"/);
  });
});
