
import { specUtils } from "wheatsystem-spec";

export const instructionTypes: InstructionType[] = [];

export class InstructionType {
    name: string;
    opcode: number;
    argAmount: number;
    
    constructor(name: string, opcode: number, argAmount: number) {
        this.name = name;
        this.opcode = opcode;
        this.argAmount = argAmount;
    }
}

const instructionsText = specUtils.readInstructionsText();
const categories = specUtils.parseInstructions(instructionsText);

for (const category of categories) {
    for (const instruction of category.instructions) {
        const instructionType = new InstructionType(
            instruction.name,
            instruction.opcode,
            instruction.arguments.length,
        );
        instructionTypes.push(instructionType);
    }
}


