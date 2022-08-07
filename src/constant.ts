/* eslint-disable camelcase */

import { instances as specInstances } from "wheatsystem-spec";
import { MixedNumber } from "./types.js";
import { DataType, SignedIntegerType, compressibleIntegerType, NumberType, StringType } from "./delegates/dataType.js";
import { AssemblyError } from "./assemblyError.js";
import { Identifier, IdentifierMap } from "./identifier.js";

export abstract class Constant {
    
    constructor() {
        // Do nothing.
        
    }
    
    abstract getDataType(): DataType;
    
    abstract setDataType(dataType: DataType): void;
    
    abstract copy(): Constant;
    
    abstract createBuffer(): Buffer;
    
    compress(signedIntegerTypeList: SignedIntegerType[]): void {
        // Do nothing.
        
    }
}

export class NumberConstant extends Constant {
    value: MixedNumber;
    numberType: NumberType;
    
    constructor(value: MixedNumber, numberType: NumberType) {
        super();
        this.value = numberType.restrictNumber(value);
        this.numberType = numberType;
    }
    
    getDataType(): DataType {
        return this.numberType;
    }
    
    setDataType(dataType: DataType): void {
        if (!(dataType instanceof NumberType)) {
            throw new AssemblyError("Conversion is only supported between number types.");
        }
        this.numberType = dataType as NumberType;
        this.value = this.numberType.restrictNumber(this.value);
    }
    
    copy(): Constant {
        return new NumberConstant(this.value, this.numberType);
    }
    
    createBuffer(): Buffer {
        return this.numberType.convertNumberToBuffer(this.value);
    }
    
    compress(signedIntegerTypeList: SignedIntegerType[]): void {
        if (!(this.numberType instanceof SignedIntegerType
                && this.numberType.getIsCompressible())) {
            return;
        }
        for (const signedIntegerType of signedIntegerTypeList) {
            if (signedIntegerType.contains(this.value)) {
                this.numberType = signedIntegerType;
                return;
            }
        }
        throw new AssemblyError("Integer is out of range.");
    }
}

export class StringConstant extends Constant {
    value: string;
    stringType: StringType;
    
    constructor(value: string) {
        super();
        this.value = value;
        this.stringType = new StringType(value.length);
    }
    
    getDataType(): DataType {
        return this.stringType;
    }
    
    setDataType(dataType: DataType): void {
        if (!this.stringType.equals(dataType)) {
            throw new AssemblyError("Cannot change data type of string.");
        }
    }
    
    copy(): Constant {
        return new StringConstant(this.value);
    }
    
    createBuffer(): Buffer {
        return Buffer.from(this.value, "utf8");
    }
}

export const builtInConstantMap = new IdentifierMap<Constant>();

const tempMap: { [name: string]: number } = {
    null: 0,
    guardedAllocAttr: 1,
    sentryAllocAttr: 2,
};

const { errorSpecification } = specInstances;
for (const definition of errorSpecification.getDefinitions()) {
    tempMap[definition.name] = definition.value;
}

for (const name in tempMap) {
    const identifier = new Identifier(name);
    const constant = new NumberConstant(tempMap[name], compressibleIntegerType);
    builtInConstantMap.set(identifier, constant);
}


