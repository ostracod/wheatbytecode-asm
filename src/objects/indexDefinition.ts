
import {
    IndexConverter as IndexConverterInterface,
    IndexRefConverter as IndexRefConverterInterface,
    IndexDefinition as IndexDefinitionInterface,
    Identifier, InstructionArg, Constant
} from "../models/objects.js";
import {DataType} from "../models/delegates.js";
import {instructionUtils} from "../utils/instructionUtils.js";
import {signedInteger32Type, compressibleIntegerType} from "../delegates/dataType.js";
import {UnresolvedIndexError} from "./assemblyError.js";
import {INSTRUCTION_REF_PREFIX, IndexInstructionArg} from "./instruction.js";
import {NumberConstant} from "./constant.js";

export interface IndexConverter extends IndexConverterInterface {}

export abstract class IndexConverter {
    
    constructor() {
        
    }
}

export class IndexConstantConverter extends IndexConverter {
    
    createConstantOrNull(index): Constant {
        if (index === null) {
            throw new UnresolvedIndexError();
        }
        return new NumberConstant(index, compressibleIntegerType);
    }
    
    createInstructionArgOrNull(indexDefinition: IndexDefinition): InstructionArg {
        if (indexDefinition.index === null) {
            return new IndexInstructionArg(indexDefinition);
        } else {
            return null;
        }
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
    
    createInstructionArgOrNull(indexDefinition: IndexDefinition): InstructionArg {
        return instructionUtils.createInstructionArgWithIndex(
            this.instructionRefPrefix,
            this.dataType,
            indexDefinition.index
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
        return this.indexConverter.createInstructionArgOrNull(this);
    }
}

export let indexConstantConverter = new IndexConstantConverter();
export let appDataIndexConverter = new IndexRefConverter(
    INSTRUCTION_REF_PREFIX.appData,
    signedInteger32Type
);


