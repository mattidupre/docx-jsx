import { toLower } from 'lodash';

export const toLowercase = <T extends string>(string: T) =>
  toLower(string) as Lowercase<T>;
