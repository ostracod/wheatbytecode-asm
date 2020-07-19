
import {ExpressionProcessor} from "models/items";
import {AssemblyLine as AssemblyLineInterface, Expression} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {lineUtils} from "utils/lineUtils";
import {expressionUtils} from "utils/expressionUtils";

export interface AssemblyLine extends AssemblyLineInterface {}

export class AssemblyLine {
    
    constructor(directiveName: string, argList: Expression[]) {
        this.directiveName = directiveName;
        this.argList = argList;
        this.lineNumber = null;
        this.filePath = null;
        // List of AssemblyLine or null.
        this.codeBlock = null;
        for (let arg of this.argList) {
            arg.processExpressions(expression => {
                expression.line = this;
                return null;
            });
        }
    }
    
    copy(): AssemblyLine {
        let tempArgList = expressionUtils.copyExpressions(this.argList);
        let output = new AssemblyLine(this.directiveName, tempArgList);
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
        let tempIndentation = niceUtils.getIndentation(indentationLevel);
        let tempTextList = this.argList.map(arg => arg.getDisplayString());
        let tempLineText = tempIndentation + this.directiveName + " " + tempTextList.join(", ");
        if (this.codeBlock === null) {
            return tempLineText;
        } else {
            let tempLineTextList = [tempLineText];
            for (let line of this.codeBlock) {
                tempLineTextList.push(line.getDisplayString(indentationLevel + 1));
            }
            tempLineTextList.push("END");
            return tempLineTextList.join("\n");
        }
    }
    
    processExpressions(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void {
        expressionUtils.processExpressions(this.argList, processExpression, shouldRecurAfterProcess);
        if (this.codeBlock !== null) {
            lineUtils.processExpressionsInLines(this.codeBlock, processExpression, shouldRecurAfterProcess);
        }
    }
}


