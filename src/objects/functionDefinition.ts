
import {LineProcessor} from "models/items";
import {
    FunctionImplementation as FunctionImplementationInterface,
    FunctionDefinition as FunctionDefinitionInterface,
    AssemblyLine
} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";

import {AssemblyError} from "objects/assemblyError";
import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {Scope} from "objects/scope";
import {InstructionLineList} from "objects/labeledLineList";
import {Identifier, IdentifierMap} from "objects/identifier";

export const functionTableEntrySize = 21;

export interface FunctionImplementation extends FunctionImplementationInterface {}

export class FunctionImplementation {
    
    constructor(functionDefinition: FunctionDefinition) {
        this.functionDefinition = functionDefinition;
        this.localVariableDefinitionMap = new IdentifierMap();
        this.localFrameSize = null;
        this.instructionList = [];
    }
    
    getDisplayString(indentationLevel: number): string {
        let tempTextList = [];
        tempTextList.push(this.getLineList().getDisplayString(
            "Instruction body",
            indentationLevel
        ));
        tempTextList.push(niceUtils.getDisplayableListDisplayString(
            "Assembled instructions",
            this.instructionList,
            indentationLevel
        ));
        tempTextList.push(niceUtils.getIdentifierMapDisplayString(
            "Local variables",
            this.localVariableDefinitionMap,
            indentationLevel
        ));
        return niceUtils.joinTextList(tempTextList);
    }
    
    getScope(): Scope {
        return this.functionDefinition.scope;
    }
    
    getLineList(): InstructionLineList {
        return this.functionDefinition.lineList;
    }
    
    processLines(processLine: LineProcessor): void {
        this.functionDefinition.processLines(processLine);
    }
    
    extractDefinitions(): void {
        this.extractLocalVariableDefinitions();
        this.getLineList().extractLabelDefinitions();
    }
    
    extractLocalVariableDefinitions(): void {
        this.processLines(line => {
            let tempLocalDefinition = variableUtils.extractLocalVariableDefinition(line);
            if (tempLocalDefinition !== null) {
                this.localVariableDefinitionMap.setIndexDefinition(tempLocalDefinition);
                return [];
            }
            return null;
        });
        this.localFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.localVariableDefinitionMap
        );
    }
    
    populateScopeDefinitions(): void {
        this.getScope().indexDefinitionMapList.push(
            this.localVariableDefinitionMap,
            this.getLineList().labelDefinitionMap
        );
    }
    
    assembleInstructions(): void {
        this.instructionList = this.getLineList().assembleInstructions();
    }
}

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export class FunctionDefinition extends IndexDefinition {
    
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        super(identifier, indexConstantConverter);
        this.lineList = new InstructionLineList(lineList);
        this.argVariableDefinitionMap = new IdentifierMap();
        this.argFrameSize = null;
        this.scope = null;
        this.functionImplementation = new FunctionImplementation(this);
    }
    
    processLines(processLine: LineProcessor): void {
        this.lineList.processLines(processLine);
    }
    
    populateScope(parentScope: Scope): void {
        this.scope = new Scope(parentScope);
        this.lineList.populateScope(this.scope);
    }
    
    extractDefinitions(): void {
        this.extractArgVariableDefinitions();
        if (this.functionImplementation !== null) {
            this.functionImplementation.extractDefinitions();
        }
    }
    
    getDisplayString(): string {
        let tempTitle = `function ${this.identifier.name}`;
        let tempTextList = [tempTitle + ":"];
        if (this.functionImplementation !== null) {
            tempTextList.push(this.functionImplementation.getDisplayString(1));
        }
        tempTextList.push(niceUtils.getIdentifierMapDisplayString(
            "Argument variables",
            this.argVariableDefinitionMap,
            1
        ));
        return niceUtils.joinTextList(tempTextList);
    }
    
    extractArgVariableDefinitions(): void {
        this.processLines(line => {
            let tempArgDefinition = variableUtils.extractArgVariableDefinition(line);
            if (tempArgDefinition !== null) {
                this.argVariableDefinitionMap.setIndexDefinition(tempArgDefinition);
                return [];
            }
            return null;
        });
        this.argFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.argVariableDefinitionMap
        );
    }
    
    populateScopeDefinitions(): void {
        this.scope.indexDefinitionMapList = [this.argVariableDefinitionMap];
        if (this.functionImplementation !== null) {
            this.functionImplementation.populateScopeDefinitions();
        }
    }
    
    createTableEntryBuffer(
        instructionsFilePos: number,
        instructionsSize: number
    ): Buffer {
        let output = Buffer.alloc(functionTableEntrySize);
        // TODO: Populate missing parameters.
        //output.writeInt32LE(this.id, 0);
        //output.writeUInt8LE(this.isGuarded ? 1 : 0, 4);
        output.writeUInt32LE(this.argFrameSize, 5);
        output.writeUInt32LE(this.functionImplementation.localFrameSize, 9);
        output.writeUInt32LE(instructionsFilePos, 13);
        output.writeUInt32LE(instructionsSize, 17);
        return output;
    }
    
    createInstructionsBuffer(): Buffer {
        this.functionImplementation.assembleInstructions();
        return Buffer.concat(
            this.functionImplementation.instructionList.map(instruction => {
                return instruction.createBuffer()
            })
        );
    }
}


