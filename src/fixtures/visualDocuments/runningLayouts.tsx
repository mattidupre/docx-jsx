import {
  IfEnvironment,
  PageCount,
  PageNumber,
  Typography,
} from '../../reactComponents';

const PageCounter = () => (
  <IfEnvironment not documentType="web">
    <span>
      Page <PageNumber /> of <PageCount />
    </span>
  </IfEnvironment>
);

/**
 * Each layout element must be a distinct node, so the layouts are built by a
 * factory rather than by reusing one element in both slots.
 */
export const runningLayouts = (prefix: string) => ({
  first: {
    header: (
      <Typography as="p">
        {prefix} / FIRST / <PageCounter />
      </Typography>
    ),
    footer: (
      <Typography as="p">
        {prefix} / FIRST FOOTER / <PageCounter />
      </Typography>
    ),
  },
  subsequent: {
    header: (
      <Typography as="p">
        {prefix} / DEFAULT / <PageCounter />
      </Typography>
    ),
    footer: (
      <Typography as="p">
        {prefix} / DEFAULT FOOTER / <PageCounter />
      </Typography>
    ),
  },
});
