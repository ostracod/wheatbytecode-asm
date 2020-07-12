
import {MixedNumber} from "models/items";
import {
    DataType as DataTypeInterface,
    NumberType as NumberTypeInterface,
    IntegerType as IntegerTypeInterface,
    SignedIntegerType as SignedIntegerTypeInterface,
    StringType as StringTypeInterface
} from "models/delegates";
import {mathUtils} from "utils/mathUtils";

export let numberTypeList: NumberType[] = [];
export let numberTypeMap: {[name: string]: NumberType} = {};
export let unsignedIntegerTypeList: UnsignedIntegerType[] = [];
export let signedIntegerTypeList: SignedIntegerType[] = [];

export interface DataType extends DataTypeInterface {}

export abstract class DataType {
    
    constructor(byteAmount: number) {
        this.byteAmount = byteAmount;
        this.bitAmount = this.byteAmount * 8;
    }
    
    getArgPrefix(): number {
        return null;
    }
    
    equals(dataType: DataType): boolean {
        return (this.byteAmount === dataType.byteAmount);
    }
}

export interface NumberType extends NumberTypeInterface {}

export abstract class NumberType extends DataType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
        numberTypeList.push(this);
    }
    
    getName(): string {
        return this.getNamePrefix() + this.bitAmount;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        return value;
    }
}

export interface IntegerType extends IntegerTypeInterface {}

export class IntegerType extends NumberType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
    }
    
    getByteAmountMergePriority(): number {
        return 1;
    }
    
    contains(value: MixedNumber): boolean {
        let tempValue = mathUtils.convertMixedNumberToBigInt(value);
        return (tempValue >= this.getMinimumNumber() && tempValue <= this.getMaximumNumber());
    }
}

export class UnsignedIntegerType extends IntegerType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
        unsignedIntegerTypeList.push(this);
    }
    
    getNamePrefix(): string {
        return "u";
    }
    
    getClassMergePriority(): number {
        return 1;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        let output = Buffer.alloc(this.byteAmount);
        if (this.byteAmount === 8) {
            output.writeBigUInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
        } else {
            output.writeUIntLE(Number(value), 0, this.byteAmount);
        }
        return output;
    }
    
    getMinimumNumber(): bigint {
        return 0n;
    }
    
    getMaximumNumber(): bigint {
        return (1n << BigInt(this.bitAmount)) - 1n;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        return mathUtils.convertMixedNumberToBigInt(value) & ((1n << BigInt(this.bitAmount)) - 1n);
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof UnsignedIntegerType);
    }
}

export interface SignedIntegerType extends SignedIntegerTypeInterface {}

export class SignedIntegerType extends IntegerType {
    
    constructor(argPrefix: number, byteAmount: number) {
        super(byteAmount);
        this.argPrefix = argPrefix;
        signedIntegerTypeList.push(this);
    }
    
    getArgPrefix(): number {
        return this.argPrefix;
    }
    
    getNamePrefix(): string {
        return "s";
    }
    
    getClassMergePriority(): number {
        return 2;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        let output = Buffer.alloc(this.byteAmount);
        let tempAmount;
        if (this.byteAmount === 8) {
            output.writeBigInt64LE(mathUtils.convertMixedNumberToBigInt(value), 0);
        } else {
            output.writeIntLE(Number(value), 0, this.byteAmount);
        }
        return output;
    }
    
    getMinimumNumber(): bigint {
        return -(1n << BigInt(this.bitAmount - 1));
    }
    
    getMaximumNumber(): bigint {
        return (1n << BigInt(this.bitAmount - 1)) - 1n;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        let tempOffset = 1n << BigInt(this.bitAmount);
        value = mathUtils.convertMixedNumberToBigInt(value) & (tempOffset - 1n);
        if (value > this.getMaximumNumber()) {
            value -= tempOffset;
        }
        return value;
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof SignedIntegerType);
    }
}

export class FloatType extends NumberType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
    }
    
    getNamePrefix(): string {
        return "f";
    }
    
    getClassMergePriority(): number {
        return 3;
    }
    
    getByteAmountMergePriority(): number {
        return 2;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        let tempNumber = Number(value);
        let output;
        if (this.byteAmount <= 4) {
            output = Buffer.alloc(4);
            output.writeFloatLE(tempNumber, 0);
        } else {
            output = Buffer.alloc(8);
            output.writeDoubleLE(tempNumber, 0);
        }
        return output;
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof FloatType);
    }
}

export interface StringType extends StringTypeInterface {}

export class StringType extends DataType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
    }
    
    getName(): string {
        return "b" + this.bitAmount;
    }
    
    equals(dataType: DataType) {
        if (!super.equals(dataType)) {
            return false;
        }
        return (dataType instanceof StringType);
    }
}

export const unsignedInteger8Type = new UnsignedIntegerType(1);
export const unsignedInteger16Type = new UnsignedIntegerType(2);
export const unsignedInteger32Type = new UnsignedIntegerType(4);
export const unsignedInteger64Type = new UnsignedIntegerType(8);
export const signedInteger8Type = new SignedIntegerType(0, 1);
export const signedInteger16Type = new SignedIntegerType(null, 2);
export const signedInteger32Type = new SignedIntegerType(1, 4);
export const signedInteger64Type = new SignedIntegerType(null, 8);
export const float32Type = new FloatType(4);
export const float64Type = new FloatType(8);

for (let numberType of numberTypeList) {
    numberTypeMap[numberType.getName()] = numberType;
}

let integerComparator = ((type1, type2) => (type1.byteAmount - type2.byteAmount));
signedIntegerTypeList.sort(integerComparator);
unsignedIntegerTypeList.sort(integerComparator);


