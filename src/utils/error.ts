export type ErrorObject = { error: unknown };

export const isErrorObject = (value: unknown): value is ErrorObject =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  !!(value as ErrorObject).error;

export const stringifyErrorObject = ({ error }: ErrorObject) =>
  error instanceof Error ? error.message : String(error);
