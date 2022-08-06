
import { Identifier, IdentifierMap } from "./identifier.js";
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
    
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition {
        for (const identifierMap of this.indexDefinitionMapList) {
            const tempDefinition = identifierMap.get(identifier);
            if (tempDefinition !== null) {
                return tempDefinition;
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getIndexDefinitionByIdentifier(identifier);
        }
    }
    
    getFunctionByIdentifier(identifier: Identifier): AbstractFunction {
        for (const identifierMap of this.functionMaps) {
            const definition = identifierMap.get(identifier);
            if (definition !== null) {
                return definition;
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getFunctionByIdentifier(identifier);
        }
    }
    
    identifierIsKnown(identifier: Identifier): boolean {
        return (identifier.getIsBuiltIn()
            || this.getIndexDefinitionByIdentifier(identifier) !== null
            || this.getFunctionByIdentifier(identifier) !== null);
    }
}


