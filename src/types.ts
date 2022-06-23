
import { NumberType } from "./delegates/dataType.js";
import { InstructionType } from "./delegates/instructionType.js";
import { Expression, ArgNumber } from "./expression.js";
import { InstructionArg } from "./instruction.js";
import { AssemblyLine } from "./lines/assemblyLine.js";
import { VariableDefinition } from "./definitions/variableDefinition.js";
import { LabelDefinition } from "./definitions/labelDefinition.js";

export type ExpressionProcessor = ((expression: Expression) => Expression);

export type LineProcessor = ((line: AssemblyLine) => AssemblyLine[]);

export type InstructionArgProcessor = ((arg: InstructionArg) => void);

export type NumberTypeClass = (new (...args: any[]) => NumberType);

export type VariableDefinitionClass = (new (...args: any[]) => VariableDefinition);

export type LabelDefinitionClass = (new (...args: any[]) => LabelDefinition);

// In BreadBytecode assembly language, ArgNumeric can also be an ArgVersionNumber.
export type ArgNumeric = ArgNumber;

export type MixedNumber = (number | bigint);

export type InstructionTypeMap = { [name: string]: InstructionType };

export interface Displayable {
    getDisplayString(): string;
}

export interface AssemblerOptions {
    shouldBeVerbose?: boolean;
    shouldPrintLog?: boolean;
    extraInstructionTypes?: InstructionType[];
}


