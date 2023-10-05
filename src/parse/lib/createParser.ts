import {
  type ParserEnvironment,
  type Parser,
  type IntrinsicType,
  PROPS_PARSERS,
  ENVIRONMENT_PARSERS,
} from '../entities';

const parsersByEnvironment = {
  docx: (type: IntrinsicType, options: any) =>
    ENVIRONMENT_PARSERS[type].docx(options),
  ast: (type: IntrinsicType, options: any) => ({ type, options }),
};

function assertType(value: string): asserts value is IntrinsicType {
  if (!(value in PROPS_PARSERS)) {
    throw new TypeError(`Invalid type ${value}.`);
  }
}

export const createParser = (environment: ParserEnvironment): Parser => {
  const parseOptions = parsersByEnvironment[environment];
  return ({ type, props }, context) => {
    assertType(type);
    return parseOptions(type, PROPS_PARSERS[type](props as any, context));
  };
};
