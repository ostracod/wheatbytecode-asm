
import { LineProcessor, LabelDefinitionClass } from "../types.js";
import * as niceUtils from "../utils/niceUtils.js";
import * as lineUtils from "../utils/lineUtils.js";
import { AssemblyError } from "../assemblyError.js";
import { IdentifierMap } from "../identifier.js";
import { Scope } from "../scope.js";
import { Instruction } from "../instruction.js";
import { LabelDefinition, InstructionLabelDefinition, AppDataLabelDefinition } from "../definitions/labelDefinition.js";
import { AssemblyLine } from "./assemblyLine.js";
import { SerializableLine, AppData } from "./serializableLine.js";

export abstract class LabeledLineList {
    lineList: AssemblyLine[];
    serializableLineList: SerializableLine[];
    labelDefinitionMap: IdentifierMap<LabelDefinition>;
    
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
        this.serializableLineList = null;
        this.labelDefinitionMap = null;
    }
    
    abstract getLabelDefinitionClass(): LabelDefinitionClass;
    
    abstract assembleSerializableLine(line: AssemblyLine): SerializableLine;
    
    populateScope(scope: Scope) {
        lineUtils.processExpressionsInLines(this.lineList, (expression) => {
            expression.scope = scope;
            return null;
        });
    }
    
    processLines(processLine: LineProcessor): void {
        const tempResult = lineUtils.processLines(this.lineList, processLine);
        this.lineList = tempResult.lineList;
    }
    
    getLineBufferIndexMap(): { [lineIndex: number]: number } {
        const output = {};
        let bufferIndex = 0;
        let lineIndex = 0;
        output[lineIndex] = bufferIndex;
        while (lineIndex < this.serializableLineList.length) {
            const tempLine = this.serializableLineList[lineIndex];
            bufferIndex += tempLine.getBufferLength();
            lineIndex += 1;
            output[lineIndex] = bufferIndex;
        }
        return output;
    }
    
    extractLabelDefinitions(): void {
        const tempLabelDefinitionClass = this.getLabelDefinitionClass();
        this.labelDefinitionMap = new IdentifierMap();
        let index = 0;
        this.processLines((line) => {
            const tempArgList = line.argList;
            if (line.directiveName === "LBL") {
                if (tempArgList.length !== 1) {
                    throw new AssemblyError("Expected 1 argument.");
                }
                const tempIdentifier = tempArgList[0].evaluateToIdentifier();
                const tempDefinition = new tempLabelDefinitionClass(tempIdentifier, index);
                this.labelDefinitionMap.setIndexDefinition(tempDefinition);
                return [];
            }
            index += 1;
            return null;
        });
    }
    
    // Returns whether we should repeat this function again.
    populateLabelDefinitionIndexes(): boolean {
        const lineBufferIndexMap = this.getLineBufferIndexMap();
        this.labelDefinitionMap.iterate((labelDefinition) => {
            labelDefinition.index = lineBufferIndexMap[labelDefinition.lineIndex];
        });
        return false;
    }
    
    getDisplayString(title: string, indentationLevel?: number): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0;
        }
        if (this.lineList.length <= 0) {
            return "";
        }
        const tempIndentation = niceUtils.getIndentation(indentationLevel);
        const tempTextList = [tempIndentation + title + ":"];
        tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, indentationLevel + 1));
        tempTextList.push(niceUtils.getIdentifierMapDisplayString(
            title + " labels",
            this.labelDefinitionMap,
            indentationLevel,
        ));
        return niceUtils.joinTextList(tempTextList);
    }
    
    assembleSerializableLines(): void {
        this.serializableLineList = [];
        this.processLines((line) => {
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
        const bufferList = this.serializableLineList.map((serializableLine) => {
            try {
                return serializableLine.createBuffer();
            } catch (error) {
                if (error instanceof AssemblyError) {
                    error.populateLine(serializableLine.assemblyLine);
                }
                throw error;
            }
        });
        return Buffer.concat(bufferList);
    }
}

export class InstructionLineList extends LabeledLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return InstructionLabelDefinition;
    }
    
    populateLabelDefinitionIndexes(): boolean {
        super.populateLabelDefinitionIndexes();
        let output = false;
        for (const serializableLine of this.serializableLineList) {
            const tempInstruction = serializableLine as Instruction;
            tempInstruction.processArgs((arg) => {
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

export class AppDataLineList extends LabeledLineList {
    
    constructor(lineList: AssemblyLine[], scope: Scope) {
        super(lineList);
        this.populateScope(scope);
    }
    
    extractLabelDefinitions(): void {
        super.extractLabelDefinitions();
        this.processLines((line) => {
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


