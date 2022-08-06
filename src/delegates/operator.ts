
import { MixedNumber } from "../types.js";
import * as dataTypeUtils from "../utils/dataTypeUtils.js";
import * as mathUtils from "../utils/mathUtils.js";
import { compressibleIntegerType, DataType, NumberType, IntegerType } from "../delegates/dataType.js";
import { AssemblyError } from "../assemblyError.js";
import { Identifier } from "../identifier.js";
import { Constant, NumberConstant, StringConstant } from "../constant.js";
import { Expression, UnaryOperatorExpression, MacroIdentifierExpression, BinaryExpression } from "../expression.js";
import { InstructionArg } from "../instruction.js";

export const unaryOperatorList = [];
export const binaryOperatorList = [];

export abstract class Operator {
    text: string;
    
    constructor(text: string) {
        this.text = text;
    }
}

export class UnaryOperator extends Operator {
    
    constructor(text: string) {
        super(text);
        unaryOperatorList.push(this);
    }
    
    createExpression(operand: Expression): Expression {
        return new UnaryOperatorExpression(this, operand);
    }
    
    getConstantDataType(operand: Expression): DataType {
        return operand.getConstantDataType();
    }
    
    createConstantOrNull(operand: Expression): Constant {
        return null;
    }
}

export class UnaryNumberOperator extends UnaryOperator {
    
    createConstantOrNull(operand: Expression): Constant {
        const tempConstant = operand.evaluateToConstantOrNull();
        if (tempConstant === null) {
            return null;
        }
        if (!(tempConstant instanceof NumberConstant)) {
            throw new AssemblyError("Expected numeric value.");
        }
        const tempNumberConstant = tempConstant.copy() as NumberConstant;
        const tempNumberType = this.getConstantDataType(operand) as NumberType;
        let tempValue: MixedNumber;
        if (tempNumberType instanceof IntegerType) {
            tempValue = this.calculateInteger(
                mathUtils.convertMixedNumberToBigInt(tempNumberConstant.value),
            );
        } else {
            tempValue = this.calculateFloat(Number(tempNumberConstant.value));
        }
        return new NumberConstant(tempValue, tempNumberType);
    }
    
    calculateInteger(value: bigint): bigint {
        throw new AssemblyError("Unsupported operation on integer.");
    }
    
    calculateFloat(value: number): number {
        throw new AssemblyError("Unsupported operation on floating point number.");
    }
}

export class NegationOperator extends UnaryNumberOperator {
    
    constructor() {
        super("-");
    }
    
    calculateInteger(value: bigint): bigint {
        return -value;
    }
    
    calculateFloat(value: number): number {
        return -value;
    }
}

export class BitwiseInversionOperator extends UnaryNumberOperator {
    
    constructor() {
        super("~");
    }
    
    calculateInteger(value: bigint): bigint {
        return ~value;
    }
}

export class MacroIdentifierOperator extends UnaryOperator {
    
    constructor() {
        super("@");
    }
    
    createExpression(operand: Expression): Expression {
        return new MacroIdentifierExpression(operand);
    }
}

export class IndexOperator extends UnaryOperator {
    
    constructor() {
        super("?");
    }
    
    getConstantDataType(operand: Expression): DataType {
        return compressibleIntegerType;
    }
    
    createConstantOrNull(operand: Expression): Constant {
        const definition = operand.evaluateToIndexDefinitionOrNull();
        if (definition === null) {
            throw new AssemblyError("Expected index definition.");
        }
        return new NumberConstant(definition.index, compressibleIntegerType);
    }
}

export abstract class BinaryOperator extends Operator {
    precedence: number;
    
    constructor(text: string, precedence: number) {
        super(text);
        this.precedence = precedence;
        binaryOperatorList.push(this);
    }
    
    abstract getConstantDataType(operand1: Expression, operand2: Expression): DataType;
    
    createExpression(operand1: Expression, operand2: Expression): Expression {
        return new BinaryExpression(this, operand1, operand2);
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        return null;
    }
    
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg {
        return null;
    }
    
    createIdentifierOrNull(operand1: Expression, operand2: Expression): Identifier {
        return null;
    }
}

export class TypeCoercionOperator extends BinaryOperator {
    
    constructor() {
        super(":", 1);
    }
    
    getConstantDataType(operand1: Expression, operand2: Expression): DataType {
        return operand2.evaluateToDataType();
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        const tempConstant = operand1.evaluateToConstantOrNull();
        if (tempConstant === null) {
            return null;
        }
        const tempDataType = operand2.evaluateToDataType();
        tempConstant.setDataType(tempDataType);
        return tempConstant;
    }
    
    createInstructionArgOrNull(operand1: Expression, operand2: Expression): InstructionArg {
        const tempArg = operand1.evaluateToInstructionArg();
        const tempDataType = operand2.evaluateToDataType();
        tempArg.setDataType(tempDataType);
        return tempArg;
    }
}

export abstract class BinaryNumberOperator extends BinaryOperator {
    
    abstract getConstantDataTypeHelper(
        numberType1: NumberType,
        numberType2: NumberType,
    ): NumberType;
    
    abstract createConstantOrNullHelper(
        numberConstant1: NumberConstant,
        numberConstant2: NumberConstant,
    ): NumberConstant;
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        const tempConstant1 = operand1.evaluateToConstantOrNull();
        const tempConstant2 = operand2.evaluateToConstantOrNull();
        if (tempConstant1 === null || tempConstant2 === null) {
            return null;
        }
        if (!(tempConstant1 instanceof NumberConstant
                && tempConstant2 instanceof NumberConstant)) {
            throw new AssemblyError("Expected numeric value.");
        }
        const tempNumberConstant1 = tempConstant1.copy() as NumberConstant;
        const tempNumberConstant2 = tempConstant2.copy() as NumberConstant;
        return this.createConstantOrNullHelper(tempNumberConstant1, tempNumberConstant2);
    }
    
    getConstantDataType(operand1: Expression, operand2: Expression): DataType {
        const tempDataType1 = operand1.getConstantDataType();
        const tempDataType2 = operand2.getConstantDataType();
        if (!(tempDataType1 instanceof NumberType && tempDataType1 instanceof NumberType)) {
            throw new AssemblyError("Expected numeric value.");
        }
        return this.getConstantDataTypeHelper(
            tempDataType1 as NumberType,
            tempDataType2 as NumberType,
        );
    }
}

export class BinaryTypeMergeOperator extends BinaryNumberOperator {
    
    getConstantDataTypeHelper(numberType1: NumberType, numberType2: NumberType): NumberType {
        return dataTypeUtils.mergeNumberTypes(numberType1, numberType2);
    }
    
    createConstantOrNullHelper(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
        const tempNumberType = this.getConstantDataTypeHelper(
            numberConstant1.numberType,
            numberConstant2.numberType,
        );
        numberConstant1.setDataType(tempNumberType);
        numberConstant2.setDataType(tempNumberType);
        let tempValue: MixedNumber;
        if (tempNumberType instanceof IntegerType) {
            tempValue = this.calculateInteger(
                mathUtils.convertMixedNumberToBigInt(numberConstant1.value),
                mathUtils.convertMixedNumberToBigInt(numberConstant2.value),
            );
        } else {
            tempValue = this.calculateFloat(
                Number(numberConstant1.value),
                Number(numberConstant2.value),
            );
        }
        return new NumberConstant(tempValue, tempNumberType);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        throw new AssemblyError("Unsupported operation between integers.");
    }
    
    calculateFloat(value1: number, value2: number): number {
        throw new AssemblyError("Unsupported operation between floating point numbers.");
    }
}

export class AdditionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("+", 4);
    }
    
    createConstantOrNull(operand1: Expression, operand2: Expression): Constant {
        const tempConstant1 = operand1.evaluateToConstantOrNull();
        const tempConstant2 = operand2.evaluateToConstantOrNull();
        if (tempConstant1 !== null && tempConstant2 !== null
                && tempConstant1 instanceof StringConstant
                && tempConstant2 instanceof StringConstant) {
            const tempStringConstant1 = tempConstant1 as StringConstant;
            const tempStringConstant2 = tempConstant2 as StringConstant;
            return new StringConstant(tempStringConstant1.value + tempStringConstant2.value);
        } else {
            return super.createConstantOrNull(operand1, operand2);
        }
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 + value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 + value2;
    }
}

export class SubtractionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("-", 4);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 - value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 - value2;
    }
}

export class MultiplicationOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("*", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 * value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 * value2;
    }
}

export class DivisionOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("/", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 / value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 / value2;
    }
}

export class ModulusOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("%", 3);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 % value2;
    }
    
    calculateFloat(value1: number, value2: number): number {
        return value1 % value2;
    }
}

export class BitwiseAndOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("&", 6);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 & value2;
    }
}

export class BitwiseXorOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("^", 7);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 ^ value2;
    }
}

export class BitwiseOrOperator extends BinaryTypeMergeOperator {
    
    constructor() {
        super("|", 8);
    }
    
    calculateInteger(value1: bigint, value2: bigint): bigint {
        return value1 | value2;
    }
}

export abstract class BinaryBitshiftOperator extends BinaryNumberOperator {
    
    getConstantDataTypeHelper(numberType1: NumberType, numberType2: NumberType): NumberType {
        if (!(numberType1 instanceof IntegerType)) {
            throw new AssemblyError("Unsupported operation on floating point number.");
        }
        return numberType1;
    }
    
    abstract calculateInteger(value: bigint, offset: bigint): bigint;
    
    createConstantOrNullHelper(numberConstant1: NumberConstant, numberConstant2: NumberConstant): NumberConstant {
        const tempNumberType = this.getConstantDataTypeHelper(
            numberConstant1.numberType,
            numberConstant2.numberType,
        );
        const tempValue = this.calculateInteger(
            mathUtils.convertMixedNumberToBigInt(numberConstant1.value),
            mathUtils.convertMixedNumberToBigInt(numberConstant2.value),
        );
        return new NumberConstant(tempValue, tempNumberType);
    }
}

export class BitshiftLeftOperator extends BinaryBitshiftOperator {
    
    constructor() {
        super("<<", 5);
    }
    
    calculateInteger(value: bigint, offset: bigint): bigint {
        return value << offset;
    }
}

export class BitshiftRightOperator extends BinaryBitshiftOperator {
    
    constructor() {
        super(">>", 5);
    }
    
    calculateInteger(value: bigint, offset: bigint): bigint {
        return value >> offset;
    }
}

new NegationOperator();
new BitwiseInversionOperator();
export const macroIdentifierOperator = new MacroIdentifierOperator();
new IndexOperator();

new TypeCoercionOperator();
new AdditionOperator();
new SubtractionOperator();
new MultiplicationOperator();
new DivisionOperator();
new ModulusOperator();
new BitwiseAndOperator();
new BitwiseXorOperator();
new BitwiseOrOperator();
new BitshiftLeftOperator();
new BitshiftRightOperator();


