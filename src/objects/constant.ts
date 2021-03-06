
import {MixedNumber} from "models/items";
import {
    Constant as ConstantInterface,
    NumberConstant as NumberConstantInterface,
    StringConstant as StringConstantInterface
} from "models/objects";
import {DataType, IntegerType} from "models/delegates";

import {SignedIntegerType, signedIntegerTypeList, compressibleIntegerType, NumberType, StringType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";

export interface Constant extends ConstantInterface {}

export class Constant {
    
    constructor() {
        // Do nothing.
        
    }
    
    compress(signedIntegerTypeList: SignedIntegerType[]): void {
        // Do nothing.
        
    }
}

export interface NumberConstant extends NumberConstantInterface {}

export class NumberConstant extends Constant {
    
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
        for (let signedIntegerType of signedIntegerTypeList) {
            if (signedIntegerType.contains(this.value)) {
                this.numberType = signedIntegerType;
                return;
            }
        }
        throw new AssemblyError("Integer is out of range.");
    }
}

export interface StringConstant extends StringConstantInterface {}

export class StringConstant extends Constant {
    
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

export const builtInConstantSet = {
    
};

let tempNumberSet = {
    
    null: 0,
    
    genericErr: 0x01,
    noImplErr: 0x02,
    typeErr: 0x03,
    numRangeErr: 0x04,
    indexErr: 0x05,
    ptrErr: 0x06,
    nullErr: 0x07,
    dataErr: 0x08,
    argFrameErr: 0x09,
    missingErr: 0x0A,
    stateErr: 0x0B,
    permErr: 0x0C,
    capacityErr: 0x0D,
    throttleErr: 0x0E,
    
    init_ID: 1,
    kill_ID: 2,
    listenTerm_ID: 3,
    termSize_ID: 4,
    wrtTerm_ID: 5,
    termInput_ID: 6,
    startSerial_ID: 7,
    stopSerial_ID: 8,
    wrtSerial_ID: 9,
    serialInput_ID: 10,
    setGpioMode_ID: 11,
    readGpio_ID: 12,
    wrtGpio_ID: 13,
    
    guardedAllocAttr: 1,
    sentryAllocAttr: 2,
};

for (let key in tempNumberSet) {
    let tempNumber = tempNumberSet[key];
    builtInConstantSet[key] = new NumberConstant(tempNumber, compressibleIntegerType);
}


