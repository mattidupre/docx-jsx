import { PAGE_TYPES } from 'src/entities';
import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToHtmlObj } from './reactToHtmlObj';
import { it, expect } from 'vitest';

it('returns the expected object', async () => {
  const pageGroup = (await reactToHtmlObj(mockDocument)).pageGroups[0];

  expect(pageGroup.id).toBeDefined();
  expect(pageGroup.contentHtml).toBeTypeOf('string');
  expect(pageGroup.contentHtml.length).toBeGreaterThan(5);
  expect(Object.keys(pageGroup.pageTypes!)).toIncludeAnyMembers(PAGE_TYPES);
  expect(Object.values(pageGroup.pageTypes!)[0]).toEqual(
    expect.objectContaining({
      headerHtml: expect.toBeString(),
      footerHtml: expect.toBeString(),
    }),
  );
});
