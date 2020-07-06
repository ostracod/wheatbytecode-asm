
import {MixedNumber} from "models/items";
import {
    Constant as ConstantInterface,
    NumberConstant as NumberConstantInterface,
    StringConstant as StringConstantInterface
} from "models/objects";
import {DataType, IntegerType} from "models/delegates";

import {UnsignedIntegerType, SignedIntegerType, unsignedIntegerTypeList, signedIntegerTypeList, signedInteger32Type, NumberType, StringType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";

export interface Constant extends ConstantInterface {}

export class Constant {
    
    constructor() {
        // Do nothing.
        
    }
    
    compress(): void {
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
    
    compress(): void {
        let integerTypeList: IntegerType[];
        if (this.numberType instanceof UnsignedIntegerType) {
            integerTypeList = unsignedIntegerTypeList;
        } else if (this.numberType instanceof SignedIntegerType) {
            integerTypeList = signedIntegerTypeList;
        } else {
            return;
        }
        for (let integerType of integerTypeList) {
            if (integerType.contains(this.value)) {
                this.numberType = integerType;
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
    
    genericErr: 0x00,
    noImplErr: 0x01,
    typeErr: 0x02,
    numRangeErr: 0x03,
    indexErr: 0x04,
    ptrErr: 0x05,
    nullErr: 0x06,
    dataErr: 0x07,
    argFrameErr: 0x08,
    missingErr: 0x09,
    stateErr: 0x0A,
    permErr: 0x0B,
    capacityErr: 0x0C,
    throttleErr: 0x0D,
    
    init_ID: -1,
    kill_ID: -2,
    listenTerm_ID: -3,
    termSize_ID: -4,
    wrtTerm_ID: -5,
    termInput_ID: -6,
    startSerial_ID: -7,
    stopSerial_ID: -8,
    wrtSerial_ID: -9,
    serialInput_ID: -10
};

for (let key in tempNumberSet) {
    let tempNumber = tempNumberSet[key];
    builtInConstantSet[key] = new NumberConstant(tempNumber, signedInteger32Type);
}


