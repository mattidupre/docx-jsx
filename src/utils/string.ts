import { toLower } from 'lodash-es';

export const toLowercase = <T extends string>(string: T) =>
  toLower(string) as Lowercase<T>;
