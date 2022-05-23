
import { Displayable } from "../types.js";
import { Expression } from "../expression.js";
import { SignedIntegerType, signedInteger32Type } from "../delegates/dataType.js";
import { AssemblyLine } from "./assemblyLine.js";

export abstract class SerializableLine implements Displayable {
    assemblyLine: AssemblyLine;
    
    constructor(assemblyLine: AssemblyLine) {
        this.assemblyLine = assemblyLine;
    }
    
    abstract getDisplayString(): string;
    
    abstract getBufferLength(): number;
    
    abstract createBuffer(): Buffer;
}

export class AppData extends SerializableLine {
    expressionList: Expression[];
    
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


