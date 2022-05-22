
import { Displayable } from "../models/objects.js";
import { instructionUtils } from "../utils/instructionUtils.js";
import { signedInteger32Type, compressibleIntegerType, DataType } from "../delegates/dataType.js";
import { UnresolvedIndexError } from "./assemblyError.js";
import { Identifier } from "./identifier.js";
import { Constant, NumberConstant } from "./constant.js";
import { INSTRUCTION_REF_PREFIX, InstructionArg, IndexInstructionArg } from "./instruction.js";

export abstract class IndexConverter {
    
    constructor() {
        
    }
    
    abstract createConstantOrNull(index: number): Constant;
    
    abstract createInstructionArgOrNull(indexDefinition: IndexDefinition): InstructionArg;
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

export class IndexRefConverter extends IndexConverter {
    instructionRefPrefix: number;
    dataType: DataType;
    
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
            indexDefinition.index,
        );
    }
}

export abstract class IndexDefinition implements Displayable {
    identifier: Identifier;
    index: number;
    indexConverter: IndexConverter;
    
    constructor(identifier: Identifier, indexConverter: IndexConverter) {
        this.identifier = identifier;
        this.index = null;
        this.indexConverter = indexConverter;
    }
    
    abstract getDisplayString(): string;
    
    createConstantOrNull(): Constant {
        return this.indexConverter.createConstantOrNull(this.index);
    }
    
    createInstructionArgOrNull(): InstructionArg {
        return this.indexConverter.createInstructionArgOrNull(this);
    }
}

export const indexConstantConverter = new IndexConstantConverter();
export const appDataIndexConverter = new IndexRefConverter(
    INSTRUCTION_REF_PREFIX.appData,
    signedInteger32Type,
);


