
import { instances as specInstances } from "wheatsystem-spec";

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

const { instructionSpecification } = specInstances;
const instructionDefinitions = instructionSpecification.getDefinitions();

for (const instructionDefinition of instructionDefinitions) {
    const instructionType = new InstructionType(
        instructionDefinition.name,
        instructionDefinition.opcode,
        instructionDefinition.args.length,
    );
    instructionTypes.push(instructionType);
}


