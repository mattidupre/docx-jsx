export type ErrorObject = { error: unknown };

export const isErrorObject = (value: any): value is ErrorObject => {
  return typeof value === 'object' && 'error' in value && value.error;
};

export const stringifyErrorObject = ({ error }: ErrorObject) =>
  String((error as any).message);
