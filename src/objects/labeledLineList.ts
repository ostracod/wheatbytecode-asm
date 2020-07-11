
import {LineProcessor, LabelDefinitionClass} from "models/items";
import {
    LabeledLineList as LabeledLineListInterface,
    InstructionLineList as InstructionLineListInterface,
    AppDataLineList as AppDataLineListInterface,
    AssemblyLine, FunctionDefinition, Instruction, Scope, Expression, Constant
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {InstructionLabelDefinition, AppDataLabelDefinition} from "objects/labelDefinition";
import {IdentifierMap} from "objects/identifier";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";

export interface LabeledLineList extends LabeledLineListInterface {}

export class LabeledLineList {
    
    constructor(lineList: AssemblyLine[]) {
        this.lineList = lineList;
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
    
    getLineElementIndexMap(): {[lineIndex: number]: number} {
        let output = {};
        let elementIndex = 0;
        let lineIndex = 0;
        output[lineIndex] = elementIndex;
        this.processLines(line => {
            lineIndex += 1;
            elementIndex += this.getLineElementLength(line);
            output[lineIndex] = elementIndex;
            return null;
        });
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
        let lineElementIndexMap = this.getLineElementIndexMap();
        this.labelDefinitionMap.iterate(labelDefinition => {
            labelDefinition.index = lineElementIndexMap[labelDefinition.lineIndex];
            index += 1;
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
}

export interface InstructionLineList extends InstructionLineListInterface {}

export class InstructionLineList extends LabeledLineList {
    
    getLabelDefinitionClass(): LabelDefinitionClass {
        return InstructionLabelDefinition;
    }
    
    getLineElementLength(line: AssemblyLine): number {
        return 1;
    }
    
    assembleInstructions(): Instruction[] {
        let output = [];
        this.processLines(line => {
            output.push(line.assembleInstruction());
            return null;
        });
        return output;
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
    
    getLineElementLength(line: AssemblyLine): number {
        let output = 0;
        for (let expression of line.argList) {
            let tempDataType = expression.getConstantDataType();
            output += tempDataType.byteAmount;
        }
        return output;
    }
    
    createBuffer(): Buffer {
        let bufferList = [];
        this.processLines(line => {
            let tempBufferList = line.argList.map(arg => {
                let tempConstant = this.convertExpressionToConstant(arg);
                return tempConstant.createBuffer();
            });
            bufferList.push(Buffer.concat(tempBufferList));
            return null;
        });
        return Buffer.concat(bufferList);
    }
    
    convertExpressionToConstant(expression: Expression): Constant {
        return expression.evaluateToConstant();
    }
}


