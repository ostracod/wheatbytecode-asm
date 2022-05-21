
import {LineProcessor} from "../models/items.js";
import {
    FunctionImplementation as FunctionImplementationInterface,
    FunctionDefinition as FunctionDefinitionInterface,
    AssemblyLine, Expression, Instruction
} from "../models/objects.js";
import {niceUtils} from "../utils/niceUtils.js";
import {variableUtils} from "../utils/variableUtils.js";
import {AssemblyError} from "./assemblyError.js";
import {IndexDefinition, indexConstantConverter} from "./indexDefinition.js";
import {Scope} from "./scope.js";
import {InstructionLineList} from "./labeledLineList.js";
import {Identifier, IdentifierMap} from "./identifier.js";

export const functionTableEntrySize = 21;

export interface FunctionImplementation extends FunctionImplementationInterface {}

export class FunctionImplementation {
    
    constructor(functionDefinition: FunctionDefinition) {
        this.functionDefinition = functionDefinition;
        this.localVariableDefinitionMap = new IdentifierMap();
        this.localFrameSize = null;
        this.instructionList = null;
    }
    
    getDisplayString(indentationLevel: number): string {
        let tempTextList = [];
        let tempIndentation = niceUtils.getIndentation(indentationLevel);
        let tempIsGuarded = this.functionDefinition.isGuarded;
        tempTextList.push(`${tempIndentation}Is guarded: ${tempIsGuarded}`);
        let tempIdExpression = this.functionDefinition.idExpression;
        let tempIdText;
        if (this.functionDefinition.idExpression === null) {
            tempIdText = "0";
        } else {
            tempIdText = tempIdExpression.getDisplayString();
        }
        tempTextList.push(`${tempIndentation}Function ID: ${tempIdText}`);
        tempTextList.push(this.getLineList().getDisplayString(
            "Instruction body",
            indentationLevel
        ));
        if (this.instructionList !== null) {
            tempTextList.push(niceUtils.getDisplayableListDisplayString(
                "Assembled instructions",
                this.instructionList,
                indentationLevel
            ));
        }
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
    
    assembleInstructions(): Buffer {
        let tempLineList = this.getLineList();
        const output = tempLineList.createBuffer();
        this.instructionList = tempLineList.serializableLineList as Instruction[];
        return output;
    }
}

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export class FunctionDefinition extends IndexDefinition {
    
    constructor(
        identifier: Identifier,
        idExpression: Expression,
        isGuarded: boolean,
        lineList: AssemblyLine[]
    ) {
        super(identifier, indexConstantConverter);
        this.idExpression = idExpression;
        this.isGuarded = isGuarded
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
        let tempId;
        if (this.idExpression === null) {
            tempId = 0;
        } else {
            tempId = this.idExpression.evaluateToNumber();
        }
        output.writeInt32LE(tempId, 0);
        output.writeUInt8(this.isGuarded ? 1 : 0, 4);
        output.writeUInt32LE(this.argFrameSize, 5);
        output.writeUInt32LE(this.functionImplementation.localFrameSize, 9);
        output.writeUInt32LE(instructionsFilePos, 13);
        output.writeUInt32LE(instructionsSize, 17);
        return output;
    }
    
    createInstructionsBuffer(): Buffer {
        return this.functionImplementation.assembleInstructions();
    }
}


