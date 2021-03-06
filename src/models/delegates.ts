
import {MixedNumber} from "models/items";
import {Expression, Constant, NumberConstant, InstructionArg, Identifier} from "models/objects";

export interface DataType {
    byteAmount: number;
    bitAmount: number;
    
    // Concrete subclasses may override these methods:
    getArgPrefix(): number;
    
    // Concrete subclasses must implement these methods:
    getName(): string;
    equals(dataType: DataType): boolean;
}

export interface NumberType extends DataType {
    // Concrete subclasses may override these methods:
    restrictNumber(value: MixedNumber): MixedNumber;
    getIsCompressible(): boolean;
    
    // Concrete subclasses must implement these methods:
    getNamePrefix(): string;
    getClassMergePriority(): number;
    getByteAmountMergePriority(): number;
    convertNumberToBuffer(value: MixedNumber): Buffer;
}

export interface IntegerType extends NumberType {
    contains(value: MixedNumber): boolean;
    
    // Concrete subclasses must implement these methods:
    getMinimumNumber(): bigint;
    getMaximumNumber(): bigint;
}

export interface SignedIntegerType extends IntegerType {
    argPrefix: number;
}

export interface StringType extends DataType {
    
}

export interface Operator {
    text: string;
}

export interface UnaryOperator extends Operator {
    // Concrete subclasses may override these methods:
    createExpression(operand: Expression): Expression;
    getConstantDataType(operand: Expression): DataType;
    createConstantOrNull(operand: Expression): Constant;
}

export interface UnaryNumberOperator extends UnaryOperator {
    // Concrete subclasses may override these methods:
    calculateInteger(value: bigint): bigint;
    calculateFloat(value: number): number;
}

export interface BinaryOperator extends Operator {
    precedence: number;
    
    createExpression(operand1: Expression, operand2: Expression): Expression;
    
    // Concrete subclasses may override these methods:
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant;
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg;
    createIdentifierOrNull(operand1: Expression, operand2: Expression): Identifier;
    
    // Concrete subclasses must implement these methods:
    getConstantDataType(operand1: Expression, operand2: Expression): DataType;
}

export interface BinaryNumberOperator extends BinaryOperator {
    // Concrete subclasses must implement these methods:
    getConstantDataTypeHelper(numberType1: NumberType, numberType2: NumberType): NumberType;
    createConstantOrNullHelper(
        numberConstant1: NumberConstant,
        numberConstant2: NumberConstant
    ): NumberConstant;
}

export interface BinaryTypeMergeOperator extends BinaryNumberOperator {
    // Concrete subclasses may override these methods:
    calculateInteger(value1: bigint, value2: bigint): bigint;
    calculateFloat(value1: number, value2: number): number;
}

export interface BinaryBitshiftOperator extends BinaryNumberOperator {
    // Concrete subclasses must implement these methods:
    calculateInteger(value: bigint, offset: bigint): bigint;
}

export interface InstructionType {
    name: string;
    opcode: number;
    argAmount: number;
}


