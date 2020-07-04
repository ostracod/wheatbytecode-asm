
import {DataType} from "models/delegates";
import {VariableDefinition as VariableDefinitionInterface, ArgVariableDefinition as ArgVariableDefinitionInterface, Identifier} from "models/objects";

import {IndexRefConverter, IndexDefinition} from "objects/indexDefinition";
import {INSTRUCTION_REF_PREFIX} from "objects/instruction";

export interface VariableDefinition extends VariableDefinitionInterface {}

export class VariableDefinition extends IndexDefinition {
    
    constructor(identifier: Identifier, dataType: DataType, instructionRefPrefix: number) {
        super(identifier, new IndexRefConverter(instructionRefPrefix, dataType));
        this.dataType = dataType;
    }
    
    getDisplayStringHelper(): string {
        return "VAR";
    }
    
    getDisplayString(): string {
        return `${this.getDisplayStringHelper()} ${this.identifier.getDisplayString()}, ${this.dataType.getName()}`;
    }
}

export class GlobalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.globalFrame);
    }
}

export class LocalVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.localFrame);
    }
}

export interface ArgVariableDefinition extends ArgVariableDefinitionInterface {}

export class ArgVariableDefinition extends VariableDefinition {
    
    constructor(identifier: Identifier, dataType: DataType) {
        super(identifier, dataType, INSTRUCTION_REF_PREFIX.prevArgFrame);
    }
    
    getDisplayStringHelper(): string {
        return "ARG";
    }
}


