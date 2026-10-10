import { Report, starterContent } from './lib/Report';

export const wordFileType = 'dotx';

export function Document() {
  return <Report content={starterContent} />;
}
