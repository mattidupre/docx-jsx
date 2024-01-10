import type { UnitsPx, UnitsRem } from '../../entities';

const REM_SIZE_PX = 12;

const PT_PER_PX = 3 / 4;

export type DocxUnits = UnitsPx | UnitsRem;

export const toPt = (value: DocxUnits): number => {
  const float = Number.parseFloat(value);
  if (!isNaN(float)) {
    if (value.endsWith('rem')) {
      return float * REM_SIZE_PX * PT_PER_PX;
    }
    if (value.endsWith('px')) {
      return float * PT_PER_PX;
    }
  }
  throw new TypeError(`Expected value to be px or rem, received ${value}`);
};

export const toTwip = (value: DocxUnits): number => toPt(value) * 20;
