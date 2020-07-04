
import {VariableUtils as VariableUtilsInterface} from "models/utils";
import {AssemblyLine, VariableDefinition, IdentifierMap} from "models/objects";
import {VariableDefinitionClass} from "models/items";
import {BetaType} from "delegates/dataType";

import {GlobalVariableDefinition, LocalVariableDefinition, ArgVariableDefinition} from "objects/variableDefinition";
import {AssemblyError} from "objects/assemblyError";
import {FrameLength} from "objects/frameLength";

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
    ): FrameLength {
        let nextAlphaIndex = 0;
        let nextBetaIndex = 0;
        identifierMap.iterate(variableDefinition => {
            let tempBetaType = variableDefinition.dataType as BetaType;
            variableDefinition.index = nextBetaIndex;
            nextBetaIndex += tempBetaType.byteAmount;
        });
        return new FrameLength(nextAlphaIndex, nextBetaIndex);
    }
}

export const variableUtils = new VariableUtils();


