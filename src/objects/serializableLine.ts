
import {
    SerializableLine as SerializableLineInterface,
    AppData as AppDataInterface,
    AssemblyLine,
} from "../models/objects.js";
import { SignedIntegerType, signedInteger32Type } from "../delegates/dataType.js";

export interface SerializableLine extends SerializableLineInterface {}

export abstract class SerializableLine {
    
    constructor(assemblyLine: AssemblyLine) {
        this.assemblyLine = assemblyLine;
    }
}

export interface AppData extends AppDataInterface {}

export class AppData extends SerializableLine {
    
    constructor(assemblyLine: AssemblyLine) {
        super(assemblyLine);
        this.expressionList = assemblyLine.argList;
    }
    
    getDisplayString(): string {
        const tempTextList = this.expressionList.map((expression) => expression.getDisplayString());
        return "DATA " + tempTextList.join(", ");
    }
    
    getBufferLength(): number {
        let output = 0;
        for (const expression of this.expressionList) {
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
        const tempBufferList = this.expressionList.map((expression) => {
            const tempConstant = expression.evaluateToConstant();
            tempConstant.compress([signedInteger32Type]);
            return tempConstant.createBuffer();
        });
        return Buffer.concat(tempBufferList);
    }
}


