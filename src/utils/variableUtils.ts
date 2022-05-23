
import { VariableDefinitionClass } from "../types.js";
import { AssemblyError } from "../assemblyError.js";
import { IdentifierMap } from "../identifier.js";
import { AssemblyLine } from "../lines/assemblyLine.js";
import { VariableDefinition, GlobalVariableDefinition, LocalVariableDefinition, ArgVariableDefinition } from "../definitions/variableDefinition.js";

export const extractVariableDefinitionHelper = (
    line: AssemblyLine,
    directiveName: string,
    variableDefinitionClass: VariableDefinitionClass,
): VariableDefinition => {
    if (line.directiveName !== directiveName) {
        return null;
    }
    const tempArgList = line.argList;
    if (tempArgList.length < 2 || tempArgList.length > 3) {
        throw new AssemblyError("Expected 2 or 3 arguments.");
    }
    const tempIdentifier = tempArgList[0].evaluateToIdentifier();
    const tempDataType = tempArgList[1].evaluateToDataType();
    let tempArrayLength;
    if (tempArgList.length === 3) {
        tempArrayLength = tempArgList[2].evaluateToNumber();
    } else {
        tempArrayLength = 1;
    }
    return new variableDefinitionClass(tempIdentifier, tempDataType, tempArrayLength);
};

export const extractGlobalVariableDefinition = (line: AssemblyLine): VariableDefinition => (
    extractVariableDefinitionHelper(
        line,
        "VAR",
        GlobalVariableDefinition,
    )
);

export const extractLocalVariableDefinition = (line: AssemblyLine): VariableDefinition => (
    extractVariableDefinitionHelper(
        line,
        "VAR",
        LocalVariableDefinition,
    )
);

export const extractArgVariableDefinition = (line: AssemblyLine): ArgVariableDefinition => (
    extractVariableDefinitionHelper(
        line,
        "ARG",
        ArgVariableDefinition,
    )
);

export const populateVariableDefinitionIndexes = (
    identifierMap: IdentifierMap<VariableDefinition>,
): number => {
    let nextVariableIndex = 0;
    identifierMap.iterate((variableDefinition) => {
        variableDefinition.index = nextVariableIndex;
        nextVariableIndex += variableDefinition.getFrameSize();
    });
    return nextVariableIndex;
};


