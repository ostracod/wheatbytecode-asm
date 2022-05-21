
import * as fs from "fs";
import * as pathUtils from "path";
import { fileURLToPath } from "url";
import { InstructionType as InstructionTypeInterface } from "../models/delegates.js";

export interface InstructionType extends InstructionTypeInterface {}

export const instructionTypeMap: { [name: string]: InstructionType } = {};

export class InstructionType {
    
    constructor(name: string, opcode: number, argAmount: number) {
        this.name = name;
        this.opcode = opcode;
        this.argAmount = argAmount;
        instructionTypeMap[this.name] = this;
    }
}

const currentDirectoryPath = pathUtils.dirname(fileURLToPath(import.meta.url));
const instructionsPath = pathUtils.join(
    currentDirectoryPath,
    "../../../wheatsystem-spec/bytecodeInstructions.json"
);
const categoryJsonList = JSON.parse(fs.readFileSync(instructionsPath, "utf8"));

for (const categoryJson of categoryJsonList) {
    for (const instructionJson of categoryJson.instructionList) {
        new InstructionType(
            instructionJson.name,
            instructionJson.opcode,
            instructionJson.argumentList.length
        );
    }
}


