
import {InstructionUtils as InstructionUtilsInterface} from "../models/utils.js";
import {DataType} from "../models/delegates.js";
import {Constant, InstructionArg} from "../models/objects.js";
import {compressibleIntegerType, instructionDataTypeList} from "../delegates/dataType.js";
import {AssemblyError} from "../objects/assemblyError.js";
import {NumberConstant} from "../objects/constant.js";
import {INSTRUCTION_REF_PREFIX, InstructionRef, ResolvedConstantInstructionArg, RefInstructionArg} from "../objects/instruction.js";

export interface InstructionUtils extends InstructionUtilsInterface {}

export class InstructionUtils {
    
    getArgBufferLength(bufferLength: number) {
        return 1 + bufferLength;
    }
    
    createArgBuffer(refPrefix: number, dataType: DataType, buffer: Buffer): Buffer {
        const dataTypePrefix = dataType.getArgPrefix();
        if (dataTypePrefix === null) {
            throw new AssemblyError("Unsupported argument data type.");
        }
        return Buffer.concat([
            Buffer.from([(refPrefix << 4) + dataTypePrefix]),
            buffer
        ]);
    }
    
    getConstantArgBufferLength(dataType: DataType) {
        return instructionUtils.getArgBufferLength(dataType.byteAmount);
    }
    
    createConstantArgBuffer(constant: Constant): Buffer {
        return instructionUtils.createArgBuffer(
            INSTRUCTION_REF_PREFIX.constant,
            constant.getDataType(),
            constant.createBuffer()
        );
    }
    
    createInstructionArgWithIndex(refPrefix: number, dataType: DataType, index: number): InstructionArg {
        let tempRef = new InstructionRef(refPrefix);
        let tempNumberConstant = new NumberConstant(index, compressibleIntegerType);
        tempNumberConstant.compress(instructionDataTypeList);
        let tempArg = new ResolvedConstantInstructionArg(tempNumberConstant);
        return new RefInstructionArg(tempRef, dataType, tempArg);
    }
}

export const instructionUtils = new InstructionUtils();


