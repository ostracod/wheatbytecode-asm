
import { compressibleIntegerType, instructionDataTypeList, DataType } from "../delegates/dataType.js";
import { AssemblyError } from "../assemblyError.js";
import { Constant, NumberConstant } from "../constant.js";
import { INSTRUCTION_REF_PREFIX, InstructionRef, InstructionArg, ResolvedConstantInstructionArg, RefInstructionArg } from "../instruction.js";

export const getArgBufferLength = (bufferLength: number): number => 1 + bufferLength;

export const createArgBuffer = (refPrefix: number, dataType: DataType, buffer: Buffer): Buffer => {
    const dataTypePrefix = dataType.getArgPrefix();
    if (dataTypePrefix === null) {
        throw new AssemblyError("Unsupported argument data type.");
    }
    return Buffer.concat([
        Buffer.from([(refPrefix << 4) + dataTypePrefix]),
        buffer,
    ]);
};

export const getConstantArgBufferLength = (dataType: DataType): number => (
    getArgBufferLength(dataType.byteAmount)
);

export const createConstantArgBuffer = (constant: Constant): Buffer => (
    createArgBuffer(
        INSTRUCTION_REF_PREFIX.constant,
        constant.getDataType(),
        constant.createBuffer(),
    )
);

export const createInstructionArgWithIndex = (
    refPrefix: number,
    dataType: DataType,
    index: number,
): InstructionArg => {
    const tempRef = new InstructionRef(refPrefix);
    const tempNumberConstant = new NumberConstant(index, compressibleIntegerType);
    tempNumberConstant.compress(instructionDataTypeList);
    const tempArg = new ResolvedConstantInstructionArg(tempNumberConstant);
    return new RefInstructionArg(tempRef, dataType, tempArg);
};


