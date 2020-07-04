
import {LineProcessor} from "models/items";
import {
    FunctionImplementation as FunctionImplementationInterface,
    FunctionDefinition as FunctionDefinitionInterface,
    AssemblyLine, Region
} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";

import {AssemblyError} from "objects/assemblyError";
import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {Scope} from "objects/scope";
import {InstructionLineList, JumpTableLineList} from "objects/labeledLineList";
import {Identifier, IdentifierMap} from "objects/identifier";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";

export interface FunctionImplementation extends FunctionImplementationInterface {}

export class FunctionImplementation {
    
    constructor(functionDefinition: FunctionDefinition) {
        this.functionDefinition = functionDefinition;
        this.localVariableDefinitionMap = new IdentifierMap();
        this.localFrameLength = null;
        this.instructionList = [];
        this.jumpTableLineList = null;
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
        tempTextList.push(this.jumpTableLineList.getDisplayString(
            "Jump table",
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
        this.extractJumpTables();
        this.extractLocalVariableDefinitions();
        this.extractLabelDefinitions();
    }
    
    extractJumpTables(): void {
        let tempLineList = [];
        this.processLines(line => {
            if (line.directiveName === "JMP_TABLE") {
                if (line.argList.length !== 0) {
                    throw new AssemblyError("Expected 0 arguments.");
                }
                for (let tempLine of line.codeBlock) {
                    tempLineList.push(tempLine);
                }
                return [];
            }
            return null;
        });
        this.jumpTableLineList = new JumpTableLineList(tempLineList, this.getScope());
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
        this.localFrameLength = variableUtils.populateVariableDefinitionIndexes(
            this.localVariableDefinitionMap
        );
    }
    
    extractLabelDefinitions(): void {
        this.getLineList().extractLabelDefinitions();
        this.jumpTableLineList.extractLabelDefinitions();
    }
    
    populateScopeDefinitions(): void {
        this.getScope().indexDefinitionMapList.push(
            this.localVariableDefinitionMap,
            this.getLineList().labelDefinitionMap,
            this.jumpTableLineList.labelDefinitionMap
        );
    }
    
    assembleInstructions(): void {
        this.instructionList = this.getLineList().assembleInstructions();
    }
    
    createSubregions(): Region[] {
        let localFrameLengthRegion = new AtomicRegion(
            REGION_TYPE.localFrameLen,
            this.localFrameLength.createBuffer()
        );
        let tempBuffer = Buffer.concat(
            this.instructionList.map(instruction => instruction.createBuffer())
        );
        let instructionsRegion = new AtomicRegion(REGION_TYPE.instrs, tempBuffer);
        let output = [localFrameLengthRegion, instructionsRegion];
        tempBuffer = this.jumpTableLineList.createBuffer();
        if (tempBuffer.length > 0) {
            output.push(new AtomicRegion(REGION_TYPE.jmpTable, tempBuffer));
        }
        return output;
    }
}

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export class FunctionDefinition extends IndexDefinition {
    
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        super(identifier, indexConstantConverter);
        this.lineList = new InstructionLineList(lineList);
        this.argVariableDefinitionMap = new IdentifierMap();
        this.argFrameLength = null;
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
        this.argFrameLength = variableUtils.populateVariableDefinitionIndexes(
            this.argVariableDefinitionMap
        );
    }
    
    populateScopeDefinitions(): void {
        this.scope.indexDefinitionMapList = [this.argVariableDefinitionMap];
        if (this.functionImplementation !== null) {
            this.functionImplementation.populateScopeDefinitions();
        }
    }
    
    createRegion(): Region {
        if (this.functionImplementation === null) {
            let tempLineList = this.lineList.lineList;
            if (tempLineList.length > 0) {
                let tempLine = tempLineList[0];
                throw new AssemblyError(
                    "Unknown directive.",
                    tempLine.lineNumber,
                    tempLine.filePath
                );
            }
        } else {
            this.functionImplementation.assembleInstructions();
        }
        let tempRegionList = this.createSubregions();
        return new CompositeRegion(REGION_TYPE.privFunc, tempRegionList);
    }
    
    createSubregions(): Region[] {
        let argFrameLengthRegion = new AtomicRegion(
            REGION_TYPE.argFrameLen,
            this.argFrameLength.createBuffer()
        );
        let output: Region[] = [argFrameLengthRegion];
        if (this.functionImplementation !== null) {
            let tempRegionList = this.functionImplementation.createSubregions();
            for (let region of tempRegionList) {
                output.push(region);
            }
        }
        return output;
    }
}


