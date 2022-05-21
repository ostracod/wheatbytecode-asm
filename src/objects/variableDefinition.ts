
import {DataType} from "../models/delegates.js";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier} from "../models/objects.js";
import {IndexRefConverter, IndexDefinition} from "./indexDefinition.js";
import {INSTRUCTION_REF_PREFIX} from "./instruction.js";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition extends IndexDefinition {
    
    constructor(
        identifier: Identifier,
        dataType: DataType,
        arrayLength: number,
        instructionRefPrefix: number
    ) {
        super(identifier, new IndexRefConverter(instructionRefPrefix, dataType));
        this.dataType = dataType;
        this.arrayLength = arrayLength;
    }
    
    getFrameSize(): number {
        return this.dataType.byteAmount * this.arrayLength;
    }
    
    getDisplayStringHelper(): string {
        return "VAR";
    }
    
    getDisplayString(): string {
        let output = `${this.getDisplayStringHelper()} ${this.identifier.getDisplayString()}, ${this.dataType.getName()}`;
        if (this.arrayLength !== 1) {
            output += ", " + this.arrayLength;
        }
        return output;
    }
}

export class GlobalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, frameLength: number) {
        super(identifier, dataType, frameLength, INSTRUCTION_REF_PREFIX.globalFrame);
    }
}

export class LocalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, frameLength: number) {
        super(identifier, dataType, frameLength, INSTRUCTION_REF_PREFIX.localFrame);
    }
}

export interface ArgVariableDefinition extends ArgVariableDefinitionInterface {}

export class ArgVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, frameLength: number) {
        super(identifier, dataType, frameLength, INSTRUCTION_REF_PREFIX.prevArgFrame);
    }
    
    getDisplayStringHelper(): string {
        return "ARG";
    }
}


