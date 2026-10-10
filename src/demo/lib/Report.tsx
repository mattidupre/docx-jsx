import {
  BreakAvoid,
  DocumentProvider,
  PageCount,
  PageNumber,
  Repeater,
  Stack,
  Table,
  TableCell,
  TableRow,
  Typography,
  type Variants,
} from '../../reactComponents';

type Update = { id: string; title: string; summary: string };
type Action = { id: string; task: string; owner: string; due: string };

export type ReportContent = {
  client: string;
  period: string;
  summary: string;
  updates: ReadonlyArray<Update>;
  actions: ReadonlyArray<Action>;
};

const variants = {
  heading1: { fontSize: '24pt', color: '#17354a', marginBottom: '12pt' },
  heading2: {
    fontSize: '15pt',
    color: '#17354a',
    marginTop: '18pt',
    marginBottom: '8pt',
  },
  heading3: {
    fontSize: '11pt',
    fontWeight: 'bold',
    marginTop: '10pt',
    marginBottom: '4pt',
  },
  caption: { fontSize: '9pt', color: '#52616b' },
} satisfies Variants;

export const starterContent: ReportContent = {
  client: '[Client name]',
  period: '[Reporting period]',
  summary:
    'Replace this paragraph with the key outcomes and priorities for this reporting period.',
  updates: [],
  actions: [],
};

export const populatedContent: ReportContent = {
  client: 'Acme Studio',
  period: 'October 5–9, 2026',
  summary:
    'The team completed the research phase and agreed on the first release scope. Next week focuses on prototype review and preparing the delivery schedule.',
  updates: [
    {
      id: 'research',
      title: 'Customer research',
      summary:
        'Five interviews surfaced a consistent need for clearer project status. The findings now inform the prototype.',
    },
    {
      id: 'prototype',
      title: 'Product prototype',
      summary:
        'The first prototype is ready for review. Feedback will determine the next set of design refinements.',
    },
  ],
  actions: [
    {
      id: 'review',
      task: 'Review the prototype',
      owner: 'Design team',
      due: 'October 13',
    },
    {
      id: 'schedule',
      task: 'Confirm the delivery schedule',
      owner: 'Project lead',
      due: 'October 15',
    },
  ],
};

/** Shared layout; ordinary React props supply both starter and actual content. */
export function Report({ content }: { content: ReportContent }) {
  const header = (
    <Typography as="p" variant="caption">
      STUDIO / PROJECT REPORT
    </Typography>
  );
  const footer = (
    <Typography as="p" variant="caption" textAlign="right">
      Page <PageNumber /> of <PageCount />
    </Typography>
  );
  return (
    <DocumentProvider
      variants={variants}
      defaultTypography={{
        fontFamily: 'Arial',
        fontSize: '11pt',
        lineHeight: '1.35',
      }}
    >
      <Stack
        margin={{
          top: '0.8in',
          bottom: '0.8in',
          left: '0.8in',
          right: '0.8in',
          header: '0.35in',
          footer: '0.35in',
        }}
        layouts={{ first: { header, footer }, subsequent: { header, footer } }}
      >
        <Typography as="h1" variant="heading1">
          Project report
        </Typography>
        <Typography as="p">
          <Typography fontWeight="bold">Client: </Typography>
          {content.client}
        </Typography>
        <Typography as="p" variant="caption">
          {content.period}
        </Typography>
        <Typography as="h2" variant="heading2">
          Executive summary
        </Typography>
        <Typography as="p">{content.summary}</Typography>
        <Typography as="h2" variant="heading2">
          Project updates
        </Typography>
        <Repeater
          name="updates"
          title="Project update"
          items={content.updates}
          getKey={(update) => update.id}
          emptyItem={() => (
            <BreakAvoid>
              <Typography as="h3" variant="heading3">
                [Project or workstream]
              </Typography>
              <Typography as="p">
                Describe progress, decisions, and any open questions. Use the
                repeating section to add another update.
              </Typography>
            </BreakAvoid>
          )}
        >
          {(update) => (
            <BreakAvoid>
              <Typography as="h3" variant="heading3">
                {update.title}
              </Typography>
              <Typography as="p">{update.summary}</Typography>
            </BreakAvoid>
          )}
        </Repeater>
        <Typography as="h2" variant="heading2">
          Next actions
        </Typography>
        <Table columnWidths={[3, 2, 2]} cellPadding="6pt">
          <TableRow header>
            <TableCell>Action</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell>Due</TableCell>
          </TableRow>
          <Repeater
            name="actions"
            title="Next action"
            mode="rows"
            items={content.actions}
            getKey={(action) => action.id}
            emptyItem={() => (
              <TableRow>
                <TableCell>[Next action]</TableCell>
                <TableCell>[Owner]</TableCell>
                <TableCell>[Due date]</TableCell>
              </TableRow>
            )}
          >
            {(action) => (
              <TableRow>
                <TableCell>{action.task}</TableCell>
                <TableCell>{action.owner}</TableCell>
                <TableCell>{action.due}</TableCell>
              </TableRow>
            )}
          </Repeater>
        </Table>
      </Stack>
    </DocumentProvider>
  );
}
