
import { Identifier } from "../identifier.js";
import { IndexConverter, IndexDefinition, indexConstantConverter, appDataIndexConverter } from "./indexDefinition.js";

export abstract class LabelDefinition extends IndexDefinition {
    lineIndex: number;
    
    constructor(identifier: Identifier, indexConverter: IndexConverter, lineIndex: number) {
        super(identifier, indexConverter);
        this.lineIndex = lineIndex;
    }
    
    getDisplayString(): string {
        return `${this.identifier.getDisplayString()} = ${this.index}`;
    }
}

export class InstructionLabelDefinition extends LabelDefinition {
    
    constructor(identifier: Identifier, lineIndex: number) {
        super(identifier, indexConstantConverter, lineIndex);
    }
}

export class AppDataLabelDefinition extends LabelDefinition {
    
    constructor(identifier: Identifier, lineIndex: number) {
        super(identifier, appDataIndexConverter, lineIndex);
    }
}


