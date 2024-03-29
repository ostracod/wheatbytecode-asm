
import { ExpressionProcessor } from "../types.js";
import * as niceUtils from "../utils/niceUtils.js";
import * as lineUtils from "../utils/lineUtils.js";
import * as expressionUtils from "../utils/expressionUtils.js";
import { Expression } from "../expression.js";

export class AssemblyLine {
    directiveName: string;
    argList: Expression[];
    lineNumber: number;
    codeBlock: AssemblyLine[];
    filePath: string;
    
    constructor(directiveName: string, argList: Expression[]) {
        this.directiveName = directiveName;
        this.argList = argList;
        this.lineNumber = null;
        this.filePath = null;
        // List of AssemblyLine or null.
        this.codeBlock = null;
        for (const arg of this.argList) {
            arg.processExpressions((expression) => {
                expression.line = this;
                return null;
            });
        }
    }
    
    copy(): AssemblyLine {
        const tempArgList = expressionUtils.copyExpressions(this.argList);
        const output = new AssemblyLine(this.directiveName, tempArgList);
        output.lineNumber = this.lineNumber;
        output.filePath = this.filePath;
        if (this.codeBlock === null) {
            output.codeBlock = null;
        } else {
            output.codeBlock = lineUtils.copyLines(this.codeBlock);
        }
        return output;
    }
    
    getDisplayString(indentationLevel: number): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0;
        }
        const tempIndentation = niceUtils.getIndentation(indentationLevel);
        const tempTextList = this.argList.map((arg) => arg.getDisplayString());
        const tempLineText = tempIndentation + this.directiveName + " " + tempTextList.join(", ");
        if (this.codeBlock === null) {
            return tempLineText;
        } else {
            const tempLineTextList = [tempLineText];
            for (const line of this.codeBlock) {
                tempLineTextList.push(line.getDisplayString(indentationLevel + 1));
            }
            tempLineTextList.push("END");
            return tempLineTextList.join("\n");
        }
    }
    
    processExpressions(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean,
    ): void {
        expressionUtils.processExpressions(this.argList, processExpression, shouldRecurAfterProcess);
        if (this.codeBlock !== null) {
            lineUtils.processExpressionsInLines(this.codeBlock, processExpression, shouldRecurAfterProcess);
        }
    }
}


