
import { NumberType } from "./delegates.js";
import { Expression, AssemblyLine, VariableDefinition, LabelDefinition, ArgNumber, InstructionArg } from "./objects.js";

export type ExpressionProcessor = ((expression: Expression) => Expression);

export type LineProcessor = ((line: AssemblyLine) => AssemblyLine[]);

export type InstructionArgProcessor = ((arg: InstructionArg) => void);

export type NumberTypeClass = (new (...args: any[]) => NumberType);

export type VariableDefinitionClass = (new (...args: any[]) => VariableDefinition);

export type LabelDefinitionClass = (new (...args: any[]) => LabelDefinition);

// In BreadBytecode assembly language, ArgNumeric can also be an ArgVersionNumber.
export type ArgNumeric = ArgNumber;

export type MixedNumber = (number | bigint);


