
import { Displayable } from "../types.js";
import * as lineUtils from "../utils/lineUtils.js";
import { AssemblyError } from "../assemblyError.js";
import { Identifier, IdentifierMap } from "../identifier.js";
import { Expression } from "../expression.js";
import { AssemblyLine } from "../lines/assemblyLine.js";

export class MacroDefinition implements Displayable {
    name: string;
    argIdentifierList: Identifier[];
    lineList: AssemblyLine[];
    
    constructor(name: string, argIdentifierList: Identifier[], lineList: AssemblyLine[]) {
        this.name = name;
        this.argIdentifierList = argIdentifierList;
        this.lineList = lineList;
    }
    
    invoke(argList: Expression[], macroInvocationId: number): AssemblyLine[] {
        if (argList.length !== this.argIdentifierList.length) {
            throw new AssemblyError("Wrong number of macro arguments.");
        }
        const identifierExpressionMap = new IdentifierMap() as IdentifierMap<Expression>;
        for (let index = 0; index < this.argIdentifierList.length; index++) {
            const tempIdentifier = this.argIdentifierList[index];
            const tempExpression = argList[index];
            identifierExpressionMap.set(tempIdentifier, tempExpression);
        }
        const output = lineUtils.copyLines(this.lineList);
        lineUtils.substituteIdentifiersInLines(output, identifierExpressionMap);
        lineUtils.populateMacroInvocationIdInLines(output, macroInvocationId);
        return output;
    }
    
    getDisplayString(): string {
        const tempTextList = [];
        const tempIdentifierTextList = this.argIdentifierList.map((identifier) => identifier.getDisplayString());
        let tempText = this.name;
        if (tempIdentifierTextList.length > 0) {
            tempText += " " + tempIdentifierTextList.join(", ");
        }
        tempTextList.push(tempText + ":");
        tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, 1));
        return tempTextList.join("\n");
    }
}


