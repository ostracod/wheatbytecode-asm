
import {LineProcessor, LabelDefinitionClass} from "models/items";
import {
    LabeledLineList as LabeledLineListInterface,
    InstructionLineList as InstructionLineListInterface,
    AppDataLineList as AppDataLineListInterface,
    AssemblyLine, Scope, SerializableLine
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {InstructionLabelDefinition, AppDataLabelDefinition} from "objects/labelDefinition";
import {IdentifierMap} from "objects/identifier";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";

import {SignedIntegerType, signedInteger32Type} from "delegates/dataType";

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
    
    populateLabelDefinitionIndexes(): void {
        let lineBufferIndexMap = this.getLineBufferIndexMap();
        this.labelDefinitionMap.iterate(labelDefinition => {
            labelDefinition.index = lineBufferIndexMap[labelDefinition.lineIndex];
        });
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
        this.populateLabelDefinitionIndexes();
        const bufferList = this.serializableLineList.map(line => line.createBuffer());
        return Buffer.concat(bufferList);
    }
}

export interface InstructionLineList extends InstructionLineListInterface {}

export class InstructionLineList extends LabeledLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return InstructionLabelDefinition;
    }
    
    assembleSerializableLine(line: AssemblyLine): SerializableLine {
        return line.assembleInstruction();
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
        return line.assembleAppData();
    }
}


