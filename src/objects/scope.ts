
import {
    Scope as ScopeInterface,
    IdentifierMap, IndexDefinition, Identifier
} from "../models/objects.js";

export interface Scope extends ScopeInterface {}

export class Scope {
    
    constructor(parentScope?: Scope) {
        this.indexDefinitionMapList = [];
        if (typeof parentScope === "undefined") {
            this.parentScope = null;
        } else {
            this.parentScope = parentScope;
        }
    }
    
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition {
        for (let identifierMap of this.indexDefinitionMapList) {
            let tempDefinition = identifierMap.get(identifier);
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
}


