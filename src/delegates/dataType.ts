
import { MixedNumber } from "../types.js";
import * as mathUtils from "../utils/mathUtils.js";

export const instructionDataTypeList: SignedIntegerType[] = [];
export const numberTypeList: NumberType[] = [];
export const numberTypeMap: { [name: string]: NumberType } = {};
export const signedIntegerTypeList: SignedIntegerType[] = [];

export abstract class DataType {
    byteAmount: number;
    bitAmount: number;
    
    constructor(byteAmount: number) {
        this.byteAmount = byteAmount;
        this.bitAmount = this.byteAmount * 8;
    }
    
    abstract getName(): string;
    
    getArgPrefix(): number {
        return null;
    }
    
    equals(dataType: DataType): boolean {
        return (this.byteAmount === dataType.byteAmount);
    }
}

export abstract class NumberType extends DataType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
        numberTypeList.push(this);
    }
    
    abstract getNamePrefix(): string;
    
    abstract getClassMergePriority(): number;
    
    abstract getByteAmountMergePriority(): number;
    
    abstract convertNumberToBuffer(value: MixedNumber): Buffer;
    
    getName(): string {
        return this.getNamePrefix() + this.bitAmount;
    }
    
    restrictNumber(value: MixedNumber): MixedNumber {
        return value;
    }
    
    getIsCompressible(): boolean {
        return false;
    }
}

export abstract class IntegerType extends NumberType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
    }
    
    abstract getMinimumNumber(): bigint;
    
    abstract getMaximumNumber(): bigint;
    
    getByteAmountMergePriority(): number {
        return 1;
    }
    
    contains(value: MixedNumber): boolean {
        const tempValue = mathUtils.convertMixedNumberToBigInt(value);
        return (tempValue >= this.getMinimumNumber() && tempValue <= this.getMaximumNumber());
    }
}

export class UnsignedIntegerType extends IntegerType {
    
    constructor(byteAmount: number) {
        super(byteAmount);
    }
    
    getNamePrefix(): string {
        return "u";
    }
    
    getClassMergePriority(): number {
        return 1;
    }
    
    convertNumberToBuffer(value: MixedNumber): Buffer {
        const output = Buffer.alloc(this.byteAmount);
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

export class SignedIntegerType extends IntegerType {
    argPrefix: number;
    
    constructor(argPrefix: number, byteAmount: number) {
        super(byteAmount);
        this.argPrefix = argPrefix;
        signedIntegerTypeList.push(this);
        if (this.getArgPrefix() !== null) {
            instructionDataTypeList.push(this);
        }
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
        const output = Buffer.alloc(this.byteAmount);
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
        const tempOffset = 1n << BigInt(this.bitAmount);
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

export class CompressibleIntegerType extends SignedIntegerType {
    
    constructor() {
        super(null, 8);
    }
    
    getClassMergePriority(): number {
        return 0;
    }
    
    getByteAmountMergePriority(): number {
        return 0;
    }
    
    getIsCompressible(): boolean {
        return true;
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
        const tempNumber = Number(value);
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
export const signedInteger16Type = new SignedIntegerType(1, 2);
export const signedInteger32Type = new SignedIntegerType(2, 4);
export const signedInteger64Type = new SignedIntegerType(null, 8);
export const compressibleIntegerType = new CompressibleIntegerType();
export const float32Type = new FloatType(4);
export const float64Type = new FloatType(8);

for (const numberType of numberTypeList) {
    if (!numberType.getIsCompressible()) {
        numberTypeMap[numberType.getName()] = numberType;
    }
}

const integerComparator = ((type1, type2) => (type1.byteAmount - type2.byteAmount));
signedIntegerTypeList.sort(integerComparator);


