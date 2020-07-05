
import {VariableUtils as VariableUtilsInterface} from "models/utils";
import {AssemblyLine, VariableDefinition, IdentifierMap} from "models/objects";
import {VariableDefinitionClass} from "models/items";

import {GlobalVariableDefinition, LocalVariableDefinition, ArgVariableDefinition} from "objects/variableDefinition";
import {AssemblyError} from "objects/assemblyError";

export interface VariableUtils extends VariableUtilsInterface {}

export class VariableUtils {
    
    extractVariableDefinitionHelper(
        line: AssemblyLine,
        directiveName: string,
        variableDefinitionClass: VariableDefinitionClass
    ): VariableDefinition {
        if (line.directiveName !== directiveName) {
            return null;
        }
        let tempArgList = line.argList;
        if (tempArgList.length !== 2) {
            throw new AssemblyError("Expected 2 arguments.");
        }
        let tempIdentifier = tempArgList[0].evaluateToIdentifier();
        let tempDataType = tempArgList[1].evaluateToDataType();
        return new variableDefinitionClass(tempIdentifier, tempDataType);
    }
    
    extractGlobalVariableDefinition(line: AssemblyLine): VariableDefinition {
        return variableUtils.extractVariableDefinitionHelper(
            line,
            "VAR",
            GlobalVariableDefinition
        );
    }
    
    extractLocalVariableDefinition(line: AssemblyLine): VariableDefinition {
        return variableUtils.extractVariableDefinitionHelper(
            line,
            "VAR",
            LocalVariableDefinition
        );
    }
    
    extractArgVariableDefinition(line: AssemblyLine): ArgVariableDefinition {
        return variableUtils.extractVariableDefinitionHelper(
            line,
            "ARG",
            ArgVariableDefinition
        );
    }
    
    populateVariableDefinitionIndexes(
        identifierMap: IdentifierMap<VariableDefinition>
    ): number {
        let nextVariableIndex = 0;
        identifierMap.iterate(variableDefinition => {
            variableDefinition.index = nextVariableIndex;
            nextVariableIndex += variableDefinition.dataType.byteAmount;
        });
        return nextVariableIndex;
    }
}

export const variableUtils = new VariableUtils();


