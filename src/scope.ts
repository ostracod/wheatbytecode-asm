
import { Identifier, IdentifierMap } from "./identifier.js";
import { Constant, builtInConstantMap } from "./constant.js";
import { InstructionRef, instructionRefMap } from "./instruction.js";
import { IndexDefinition } from "./definitions/indexDefinition.js";
import { AbstractFunction } from "./definitions/functionDefinition.js";

export class Scope {
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[];
    functionMaps: IdentifierMap<AbstractFunction>[];
    parentScope: Scope;
    
    constructor(parentScope: Scope = null) {
        this.indexDefinitionMapList = [];
        this.functionMaps = [];
        this.parentScope = parentScope;
    }
    
    getIndexDefinition(identifier: Identifier): IndexDefinition {
        for (const identifierMap of this.indexDefinitionMapList) {
            const tempDefinition = identifierMap.get(identifier);
            if (tempDefinition !== null) {
                return tempDefinition;
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getIndexDefinition(identifier);
        }
    }
    
    getFunction(identifier: Identifier): AbstractFunction {
        for (const identifierMap of this.functionMaps) {
            const definition = identifierMap.get(identifier);
            if (definition !== null) {
                return definition;
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getFunction(identifier);
        }
    }
    
    getBuiltInConstant(identifier: Identifier): Constant {
        return builtInConstantMap.get(identifier);
    }
    
    getInstructionRef(identifier: Identifier): InstructionRef {
        return instructionRefMap.get(identifier);
    }
    
    identifierIsKnown(identifier: Identifier): boolean {
        return (this.getBuiltInConstant(identifier) !== null
            || this.getInstructionRef(identifier) !== null
            || this.getIndexDefinition(identifier) !== null
            || this.getFunction(identifier) !== null);
    }
}


