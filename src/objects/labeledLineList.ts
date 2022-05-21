
import {LineProcessor, LabelDefinitionClass} from "../models/items.js";
import {
    LabeledLineList as LabeledLineListInterface,
    InstructionLineList as InstructionLineListInterface,
    AppDataLineList as AppDataLineListInterface,
    AssemblyLine, Scope, SerializableLine
} from "../models/objects.js";
import {AssemblyError} from "./assemblyError.js";
import {InstructionLabelDefinition, AppDataLabelDefinition} from "./labelDefinition.js";
import {IdentifierMap} from "./identifier.js";
import {Instruction} from "./instruction.js";
import {AppData} from "./serializableLine.js";
import {niceUtils} from "../utils/niceUtils.js";
import {lineUtils} from "../utils/lineUtils.js";

export interface LabeledLineList extends LabeledLineListInterface {}

export class LabeledLineList {
    
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
        this.serializableLineList = null;
        this.labelDefinitionMap = null;
    }
    
    populateScope(scope: Scope) {
        lineUtils.processExpressionsInLines(this.lineList, expression => {
            expression.scope = scope;
            return null;
        });
    }
    
    processLines(processLine: LineProcessor): void {
        let tempResult = lineUtils.processLines(this.lineList, processLine);
        this.lineList = tempResult.lineList;
    }
    
    getLineBufferIndexMap(): {[lineIndex: number]: number} {
        let output = {};
        let bufferIndex = 0;
        let lineIndex = 0;
        output[lineIndex] = bufferIndex;
        while (lineIndex < this.serializableLineList.length) {
            let tempLine = this.serializableLineList[lineIndex];
            bufferIndex += tempLine.getBufferLength();
            lineIndex += 1;
            output[lineIndex] = bufferIndex;
        }
        return output;
    }
    
    extractLabelDefinitions(): void {
        let tempLabelDefinitionClass = this.getLabelDefinitionClass();
        this.labelDefinitionMap = new IdentifierMap();
        let index = 0;
        this.processLines(line => {
            let tempArgList = line.argList;
            if (line.directiveName === "LBL") {
                if (tempArgList.length !== 1) {
                    throw new AssemblyError("Expected 1 argument.");
                }
                let tempIdentifier = tempArgList[0].evaluateToIdentifier();
                let tempDefinition = new tempLabelDefinitionClass(tempIdentifier, index);
                this.labelDefinitionMap.setIndexDefinition(tempDefinition);
                return [];
            }
            index += 1;
            return null;
        });
    }
    
    // Returns whether we should repeat this function again.
    populateLabelDefinitionIndexes(): boolean {
        let lineBufferIndexMap = this.getLineBufferIndexMap();
        this.labelDefinitionMap.iterate(labelDefinition => {
            labelDefinition.index = lineBufferIndexMap[labelDefinition.lineIndex];
        });
        return false;
    }
    
    getDisplayString(title: string, indentationLevel?: number): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0
        }
        if (this.lineList.length <= 0) {
            return "";
        }
        let tempIndentation = niceUtils.getIndentation(indentationLevel);
        let tempTextList = [tempIndentation + title + ":"];
        tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, indentationLevel + 1));
        tempTextList.push(niceUtils.getIdentifierMapDisplayString(
            title + " labels",
            this.labelDefinitionMap,
            indentationLevel
        ));
        return niceUtils.joinTextList(tempTextList);
    }
    
    assembleSerializableLines(): void {
        this.serializableLineList = [];
        this.processLines(line => {
            this.serializableLineList.push(this.assembleSerializableLine(line));
            return null;
        });
    }
    
    createBuffer(): Buffer {
        this.assembleSerializableLines();
        while (true) {
            const tempResult = this.populateLabelDefinitionIndexes();
            if (!tempResult) {
                break;
            }
        }
        const bufferList = this.serializableLineList.map(serializableLine => {
            try {
                return serializableLine.createBuffer();
            } catch(error) {
                if (error instanceof AssemblyError) {
                    error.populateLine(serializableLine.assemblyLine);
                }
                throw error;
            }
        });
        return Buffer.concat(bufferList);
    }
}

export interface InstructionLineList extends InstructionLineListInterface {}

export class InstructionLineList extends LabeledLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return InstructionLabelDefinition;
    }
    
    populateLabelDefinitionIndexes(): boolean {
        super.populateLabelDefinitionIndexes();
        let output = false;
        for (const serializableLine of this.serializableLineList) {
            let tempInstruction = serializableLine as Instruction;
            tempInstruction.processArgs(arg => {
                const tempResult = arg.compress();
                if (tempResult) {
                    output = true;
                }
            });
        }
        return output;
    }
    
    assembleSerializableLine(line: AssemblyLine): SerializableLine {
        return new Instruction(line);
    }
}

export interface AppDataLineList extends AppDataLineListInterface {}

export class AppDataLineList extends LabeledLineList {
    
    constructor(lineList: AssemblyLine[], scope: Scope) {
        super(lineList);
        this.populateScope(scope);
    }
    
    extractLabelDefinitions(): void {
        super.extractLabelDefinitions();
        this.processLines(line => {
            if (line.directiveName !== "DATA") {
                throw new AssemblyError("Expected DATA directive.");
            }
            return null;
        });
    }
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return AppDataLabelDefinition;
    }
    
    assembleSerializableLine(line: AssemblyLine): SerializableLine {
        return new AppData(line);
    }
}


