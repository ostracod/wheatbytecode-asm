
import { InstructionArgProcessor, InstructionTypeMap, Displayable } from "./types.js";
import * as niceUtils from "./utils/niceUtils.js";
import * as mathUtils from "./utils/mathUtils.js";
import * as instructionUtils from "./utils/instructionUtils.js";
import { DataType, NumberType, SignedIntegerType, signedInteger8Type, signedInteger32Type } from "./delegates/dataType.js";
import { InstructionType } from "./delegates/instructionType.js";
import { AssemblyError } from "./assemblyError.js";
import { Constant, NumberConstant } from "./constant.js";
import { Expression } from "./expression.js";
import { AssemblyLine } from "./lines/assemblyLine.js";
import { SerializableLine } from "./lines/serializableLine.js";
import { IndexDefinition } from "./definitions/indexDefinition.js";

export const INSTRUCTION_REF_PREFIX = {
    constant: 0,
    globalFrame: 1,
    localFrame: 2,
    prevArgFrame: 3,
    nextArgFrame: 4,
    appData: 5,
    heapAlloc: 6,
};

export class Instruction extends SerializableLine {
    instructionType: InstructionType;
    argList: InstructionArg[];
    
    constructor(assemblyLine: AssemblyLine, instructionTypeMap: InstructionTypeMap) {
        super(assemblyLine);
        if (!(assemblyLine.directiveName in instructionTypeMap)) {
            throw new AssemblyError("Unrecognized opcode mnemonic.");
        }
        this.instructionType = instructionTypeMap[assemblyLine.directiveName];
        const tempAmount = this.instructionType.argAmount;
        if (assemblyLine.argList.length !== tempAmount) {
            throw new AssemblyError(`Expected ${this.instructionType.argAmount} ${niceUtils.pluralize("argument", tempAmount)}.`);
        }
        this.argList = assemblyLine.argList.map((expression) => expression.evaluateToInstructionArg());
    }
    
    getDisplayString(): string {
        let output = mathUtils.convertNumberToHexadecimal(this.instructionType.opcode, 2);
        if (this.argList.length > 0) {
            const tempTextList = this.argList.map((arg) => arg.getDisplayString());
            output += " " + tempTextList.join(", ");
        }
        return output;
    }
    
    getBufferLength(): number {
        let output = 1;
        for (const arg of this.argList) {
            output += arg.getBufferLength();
        }
        return output;
    }
    
    createBuffer(): Buffer {
        const tempBuffer = Buffer.from([this.instructionType.opcode]);
        const tempBufferList = [tempBuffer].concat(
            this.argList.map((arg) => arg.createBuffer()),
        );
        return Buffer.concat(tempBufferList);
    }
    
    processArgs(processArg: InstructionArgProcessor): void {
        for (const arg of this.argList) {
            arg.processArgs(processArg);
        }
    }
}

export class InstructionRef {
    argPrefix: number;
    
    constructor(argPrefix: number) {
        this.argPrefix = argPrefix;
    }
    
    processArgs(processArg: InstructionArgProcessor): void {
        // Do nothing.
        
    }
    
    getArgBufferLength(indexArg: InstructionArg): number {
        return instructionUtils.getArgBufferLength(indexArg.getBufferLength());
    }
    
    createArgBuffer(dataType: DataType, indexArg: InstructionArg): Buffer {
        return instructionUtils.createArgBuffer(
            this.argPrefix,
            dataType,
            indexArg.createBuffer(),
        );
    }
}

export class PointerInstructionRef extends InstructionRef {
    pointerArg: InstructionArg;
    
    constructor(pointerArg: InstructionArg) {
        super(INSTRUCTION_REF_PREFIX.heapAlloc);
        this.pointerArg = pointerArg;
    }
    
    processArgs(processArg: InstructionArgProcessor): void {
        this.pointerArg.processArgs(processArg);
    }
    
    getArgBufferLength(indexArg: InstructionArg): number {
        return instructionUtils.getArgBufferLength(
            this.pointerArg.getBufferLength() + indexArg.getBufferLength(),
        );
    }
    
    createArgBuffer(dataType: DataType, indexArg: InstructionArg): Buffer {
        return instructionUtils.createArgBuffer(
            this.argPrefix,
            dataType,
            Buffer.concat([this.pointerArg.createBuffer(), indexArg.createBuffer()]),
        );
    }
}

export abstract class InstructionArg implements Displayable {
    
    constructor() {
        // Do nothing.
        
    }
    
    abstract getDataType(): DataType;
    
    abstract setDataType(dataType: DataType): void;
    
    abstract getBufferLength(): number;
    
    abstract createBuffer(): Buffer;
    
    getDisplayString(): string {
        const tempBuffer = this.createBuffer();
        return `{${mathUtils.convertBufferToHexadecimal(tempBuffer)}}`;
    }
    
    processArgs(processArg: InstructionArgProcessor): void {
        processArg(this);
    }
    
    compress(): boolean {
        return false;
    }
}

export abstract class ConstantInstructionArg extends InstructionArg {
    
    abstract getConstant(): Constant;
    
    getBufferLength(): number {
        return instructionUtils.getConstantArgBufferLength(this.getDataType());
    }
    
    createBuffer(): Buffer {
        return instructionUtils.createConstantArgBuffer(this.getConstant());
    }
}

export class ResolvedConstantInstructionArg extends ConstantInstructionArg {
    constant: Constant;
    
    constructor(constant: Constant) {
        super();
        this.constant = constant.copy();
    }
    
    getDataType(): DataType {
        return this.constant.getDataType();
    }
    
    setDataType(dataType: DataType): void {
        this.constant.setDataType(dataType);
    }
    
    getConstant(): Constant {
        return this.constant;
    }
}

export class IndexInstructionArg extends ConstantInstructionArg {
    indexDefinition: IndexDefinition;
    dataType: DataType;
    
    constructor(indexDefinition: IndexDefinition) {
        super();
        this.indexDefinition = indexDefinition;
        this.dataType = signedInteger32Type;
    }
    
    compress(): boolean {
        if (this.dataType !== signedInteger8Type
                && signedInteger8Type.contains(this.indexDefinition.index)) {
            this.dataType = signedInteger8Type;
            return true;
        } else {
            return false;
        }
    }
    
    getDataType(): DataType {
        return this.dataType;
    }
    
    setDataType(dataType: DataType): void {
        this.dataType = dataType;
    }
    
    getConstant(): Constant {
        if (!(this.dataType instanceof NumberType)) {
            throw new AssemblyError("Expected number type.");
        }
        return new NumberConstant(
            this.indexDefinition.index,
            this.dataType as NumberType,
        );
    }
}

export class ExpressionInstructionArg extends ConstantInstructionArg {
    expression: Expression;
    dataType: DataType;
    
    constructor(expression: Expression) {
        super();
        this.expression = expression;
        this.dataType = null;
    }
    
    getDataTypeHelper(dataType: DataType) {
        if (this.dataType !== null) {
            return this.dataType;
        }
        if (dataType instanceof SignedIntegerType && dataType.getIsCompressible()) {
            return signedInteger32Type;
        }
        return dataType;
    }
    
    getDataType(): DataType {
        const tempDataType = this.expression.getConstantDataType();
        return this.getDataTypeHelper(tempDataType);
    }
    
    setDataType(dataType: DataType): void {
        this.dataType = dataType;
    }
    
    getConstant(): Constant {
        const output = this.expression.evaluateToConstant();
        const tempDataType1 = output.getDataType();
        const tempDataType2 = this.getDataTypeHelper(tempDataType1);
        if (tempDataType1 !== tempDataType2) {
            output.setDataType(tempDataType2);
        }
        return output;
    }
}

export class RefInstructionArg extends InstructionArg {
    instructionRef: InstructionRef;
    dataType: DataType;
    indexArg: InstructionArg;
    
    constructor(
        instructionRef: InstructionRef,
        dataType: DataType,
        indexArg: InstructionArg,
    ) {
        super();
        this.instructionRef = instructionRef;
        this.dataType = dataType;
        this.indexArg = indexArg;
    }
    
    processArgs(processArg: InstructionArgProcessor): void {
        super.processArgs(processArg);
        this.instructionRef.processArgs(processArg);
        this.indexArg.processArgs(processArg);
    }
    
    getDataType(): DataType {
        return this.dataType;
    }
    
    setDataType(dataType: DataType): void {
        this.dataType = dataType;
    }
    
    getBufferLength(): number {
        return this.instructionRef.getArgBufferLength(this.indexArg);
    }
    
    createBuffer(): Buffer {
        return this.instructionRef.createArgBuffer(this.dataType, this.indexArg);
    }
}

export const nameInstructionRefMap = {
    globalFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.globalFrame),
    localFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.localFrame),
    prevArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.prevArgFrame),
    nextArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.nextArgFrame),
    appData: new InstructionRef(INSTRUCTION_REF_PREFIX.appData),
};


