
import { ExpressionProcessor, LineProcessor } from "../types.js";
import { AssemblyError } from "../assemblyError.js";
import { IdentifierMap } from "../identifier.js";
import { Expression } from "../expression.js";
import { AssemblyLine } from "../lines/assemblyLine.js";

export const copyLines = (lineList: AssemblyLine[]): AssemblyLine[] => (
    lineList.map((line) => line.copy())
);

export const processExpressionsInLines = (
    lineList: AssemblyLine[],
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean,
): void => {
    for (const line of lineList) {
        line.processExpressions(processExpression, shouldRecurAfterProcess);
    }
};

export const substituteIdentifiersInLines = (lineList: AssemblyLine[], identifierExpressionMap: IdentifierMap<Expression>): void => {
    processExpressionsInLines(lineList, (expression) => expression.substituteIdentifiers(identifierExpressionMap));
};

export const populateMacroInvocationIdInLines = (lineList: AssemblyLine[], macroInvocationId: number): void => {
    processExpressionsInLines(lineList, (expression) => {
        expression.populateMacroInvocationId(macroInvocationId);
        return null;
    });
};

export const getLineListDisplayString = (lineList: AssemblyLine[], indentationLevel?: number): string => {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    const tempTextList = lineList.map((line) => line.getDisplayString(indentationLevel));
    return tempTextList.join("\n");
};

// processLine accepts a single line and returns
// either a list of lines or null. If the return
// value is null, no modification takes place.
export const processLines = (
    lineList: AssemblyLine[],
    processLine: LineProcessor,
    shouldProcessCodeBlocks?: boolean,
): { lineList: AssemblyLine[], processCount: number } => {
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
            const tempResult2 = processLines(
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
};


