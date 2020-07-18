
import {
    SerializableLine as SerializableLineInterface,
    AppData as AppDataInterface,
    Expression
} from "models/objects";
import {SignedIntegerType, signedInteger32Type} from "delegates/dataType";

export interface SerializableLine extends SerializableLineInterface {}

export abstract class SerializableLine {
    
    constructor() {
        
    }
}

export interface AppData extends AppDataInterface {}

export class AppData extends SerializableLine {
    
    constructor(expressionList: Expression[]) {
        super();
        this.expressionList = expressionList;
    }
    
    getDisplayString(): string {
        let tempTextList = this.expressionList.map(expression => {
            return expression.getDisplayString();
        });
        return "DATA " + tempTextList.join(", ");
    }
    
    getBufferLength(): number {
        let output = 0;
        for (let expression of this.expressionList) {
            let tempDataType = expression.getConstantDataType();
            if (tempDataType instanceof SignedIntegerType
                    && tempDataType.getIsCompressible()) {
                tempDataType = signedInteger32Type;
            }
            output += tempDataType.byteAmount;
        }
        return output;
    }
    
    createBuffer(): Buffer {
        let tempBufferList = this.expressionList.map(expression => {
            let tempConstant = expression.evaluateToConstant();
            tempConstant.compress([signedInteger32Type]);
            return tempConstant.createBuffer();
        });
        return Buffer.concat(tempBufferList);
    }
}


