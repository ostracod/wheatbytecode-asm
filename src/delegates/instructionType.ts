
import * as fs from "fs";
import * as pathUtils from "path";
import { fileURLToPath } from "url";
import {InstructionType as InstructionTypeInterface} from "../models/delegates.js";

export interface InstructionType extends InstructionTypeInterface {}

export let instructionTypeMap: {[name: string]: InstructionType} = {};

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
let categoryJsonList = JSON.parse(fs.readFileSync(instructionsPath, "utf8"));

for (let categoryJson of categoryJsonList) {
    for (let instructionJson of categoryJson.instructionList) {
        new InstructionType(
            instructionJson.name,
            instructionJson.opcode,
            instructionJson.argumentList.length
        );
    }
}


