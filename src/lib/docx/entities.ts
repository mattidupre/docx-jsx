import type { UnitsSize } from '../../entities';

const REM_SIZE_PX = 12;
const PT_PER_PX = 3 / 4;
const PT_PER_IN = 72;
const IN_PER_CM = 0.3937008;
const PT_PER_CM = IN_PER_CM * PT_PER_IN;

export const toPt = (value: UnitsSize): number => {
  const float = Number.parseFloat(value);
  if (!isNaN(float)) {
    if (value.endsWith('rem')) {
      return float * REM_SIZE_PX * PT_PER_PX;
    }
    if (value.endsWith('px')) {
      return float * PT_PER_PX;
    }
    if (value.endsWith('in')) {
      return float * PT_PER_IN;
    }
    if (value.endsWith('cm')) {
      return float * PT_PER_CM;
    }
  }
  throw new TypeError(
    `Expected value to be px, rem, cm, or in. Received ${value}.`,
  );
};

export const toTwip = (value: UnitsSize): number => toPt(value) * 20;
