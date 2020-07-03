
import {
    IndexConverter as IndexConverterInterface,
    IndexRefConverter as IndexRefConverterInterface,
    IndexDefinition as IndexDefinitionInterface,
    Identifier, InstructionArg, Constant
} from "models/objects";
import {DataType} from "models/delegates";

import {instructionUtils} from "utils/instructionUtils";

import {unsignedInteger64Type} from "delegates/dataType";

import {INSTRUCTION_REF_PREFIX} from "objects/instruction";
import {NumberConstant} from "objects/constant";

export interface IndexConverter extends IndexConverterInterface {}

export abstract class IndexConverter {
    
    constructor() {
        
    }
}

export class IndexConstantConverter extends IndexConverter {
    
    createConstantOrNull(index): Constant {
        return new NumberConstant(index, unsignedInteger64Type);
    }
    
    createInstructionArgOrNull(index): InstructionArg {
        return null;
    }
}

export interface IndexRefConverter extends IndexRefConverterInterface {}

export class IndexRefConverter extends IndexConverter {
    
    constructor(instructionRefPrefix: number, dataType: DataType) {
        super();
        this.instructionRefPrefix = instructionRefPrefix;
        this.dataType = dataType;
    }
    
    createConstantOrNull(index): Constant {
        return null;
    }
    
    createInstructionArgOrNull(index): InstructionArg {
        return instructionUtils.createInstructionArgWithIndex(
            this.instructionRefPrefix,
            this.dataType,
            index
        );
    }
}

export interface IndexDefinition extends IndexDefinitionInterface {}

export abstract class IndexDefinition {
    
    constructor(identifier: Identifier, indexConverter: IndexConverter) {
        this.identifier = identifier;
        this.index = null;
        this.indexConverter = indexConverter;
    }
    
    createConstantOrNull(): Constant {
        return this.indexConverter.createConstantOrNull(this.index);
    }
    
    createInstructionArgOrNull(): InstructionArg {
        return this.indexConverter.createInstructionArgOrNull(this.index);
    }
}

export let indexConstantConverter = new IndexConstantConverter();
export let appDataIndexConverter = new IndexRefConverter(
    INSTRUCTION_REF_PREFIX.appData,
    unsignedInteger64Type
);


