
import { Displayable } from "./types.js";
import { AssemblyError } from "./assemblyError.js";
import { builtInConstantSet } from "./constant.js";
import { nameInstructionRefMap } from "./instruction.js";
import { IndexDefinition } from "./definitions/indexDefinition.js";

const builtInIdentifierNameSet = {};
for (const name in nameInstructionRefMap) {
    builtInIdentifierNameSet[name] = true;
}
for (const name in builtInConstantSet) {
    builtInIdentifierNameSet[name] = true;
}

export class Identifier implements Displayable {
    name: string;
    
    constructor(name: string) {
        // TODO: Make sure that name contains valid characters.
        this.name = name;
    }
    
    getDisplayString(): string {
        return this.name;
    }
    
    getMapKey(): string {
        return this.name;
    }
    
    getIsBuiltIn(): boolean {
        return (this.name in builtInIdentifierNameSet);
    }
    
    equals(identifier: Identifier): boolean {
        return (this.getMapKey() === identifier.getMapKey());
    }
}

export class MacroIdentifier extends Identifier {
    macroInvocationId: number;
    
    constructor(name: string, macroInvocationId: number) {
        super(name);
        this.macroInvocationId = macroInvocationId;
    }
    
    getDisplayString(): string {
        return `@{${this.macroInvocationId}}${this.name}`;
    }
    
    getMapKey(): string {
        return `${this.name}@${this.macroInvocationId}`;
    }
    
    getIsBuiltIn(): boolean {
        return false;
    }
}

export class IdentifierMap<T> {
    map: { [key: string]: T };
    keyList: string[];
    
    constructor() {
        this.map = {};
        // Ensures correct order for iteration.
        this.keyList = [];
    }
    
    get(identifier: Identifier): T {
        const tempKey = identifier.getMapKey();
        if (tempKey in this.map) {
            return this.map[tempKey];
        } else {
            return null;
        }
    }
    
    set(identifier: Identifier, value: T): void {
        const tempKey = identifier.getMapKey();
        if (tempKey in this.map) {
            throw new AssemblyError("Duplicate identifier.");
        }
        this.keyList.push(tempKey);
        this.map[tempKey] = value;
    }
    
    setIndexDefinition(indexDefinition: T & IndexDefinition): void {
        this.set(indexDefinition.identifier, indexDefinition);
    }
    
    iterate(handle: (value: T) => void): void {
        for (const key of this.keyList) {
            handle(this.map[key]);
        }
    }
    
    getValueList(): T[] {
        const output = [];
        this.iterate((value) => {
            output.push(value);
        });
        return output;
    }
    
    getSize(): number {
        return this.keyList.length;
    }
}


