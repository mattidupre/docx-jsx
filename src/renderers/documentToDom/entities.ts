import { ID_PREFIX } from 'src/entities/config';

export const buildPageGroupId = (index: number) =>
  `${ID_PREFIX}-pagegroup-${index}`;

export const buildPageGroupClassName = (pageGroupId: string) => pageGroupId;
