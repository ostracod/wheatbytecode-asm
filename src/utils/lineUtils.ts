
import { ExpressionProcessor, LineProcessor } from "../models/items.js";
import { AssemblyError } from "../objects/assemblyError.js";
import { AssemblyLine } from "../objects/assemblyLine.js";
import { IdentifierMap } from "../objects/identifier.js";
import { Expression } from "../objects/expression.js";

export class LineUtils {
    
    copyLines(lineList: AssemblyLine[]): AssemblyLine[] {
        return lineList.map((line) => line.copy());
    }
    
    processExpressionsInLines(
        lineList: AssemblyLine[],
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean,
    ): void {
        for (const line of lineList) {
            line.processExpressions(processExpression, shouldRecurAfterProcess);
        }
    }
    
    substituteIdentifiersInLines(lineList: AssemblyLine[], identifierExpressionMap: IdentifierMap<Expression>): void {
        lineUtils.processExpressionsInLines(lineList, (expression) => expression.substituteIdentifiers(identifierExpressionMap));
    }
    
    populateMacroInvocationIdInLines(lineList: AssemblyLine[], macroInvocationId: number): void {
        lineUtils.processExpressionsInLines(lineList, (expression) => {
            expression.populateMacroInvocationId(macroInvocationId);
            return null;
        });
    }
    
    getLineListDisplayString(lineList: AssemblyLine[], indentationLevel?: number): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0;
        }
        const tempTextList = lineList.map((line) => line.getDisplayString(indentationLevel));
        return tempTextList.join("\n");
    }
    
    // processLine accepts a single line and returns
    // either a list of lines or null. If the return
    // value is null, no modification takes place.
    processLines(
        lineList: AssemblyLine[],
        processLine: LineProcessor,
        shouldProcessCodeBlocks?: boolean,
    ): {lineList: AssemblyLine[], processCount: number} {
        if (typeof shouldProcessCodeBlocks === "undefined") {
            shouldProcessCodeBlocks = false;
        }
        const outputLineList: AssemblyLine[] = [];
        let processCount = 0;
        for (const line of lineList) {
            let tempResult1: AssemblyLine[];
            try {
                tempResult1 = processLine(line);
            } catch (error) {
                if (error instanceof AssemblyError) {
                    error.populateLine(line);
                }
                throw error;
            }
            if (tempResult1 === null) {
                outputLineList.push(line);
            } else {
                for (const tempLine of tempResult1) {
                    outputLineList.push(tempLine);
                }
                processCount += 1;
            }
        }
        if (shouldProcessCodeBlocks) {
            for (const line of outputLineList) {
                if (line.codeBlock === null) {
                    continue;
                }
                const tempResult2 = lineUtils.processLines(
                    line.codeBlock,
                    processLine,
                    shouldProcessCodeBlocks,
                );
                line.codeBlock = tempResult2.lineList;
                processCount += tempResult2.processCount;
            }
        }
        return {
            lineList: outputLineList,
            processCount,
        };
    }
}

export const lineUtils = new LineUtils();


