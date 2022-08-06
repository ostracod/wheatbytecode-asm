
import { LineProcessor, ExpressionProcessor, InstructionTypeMap, Displayable } from "../types.js";
import * as variableUtils from "../utils/variableUtils.js";
import * as niceUtils from "../utils/niceUtils.js";
import * as lineUtils from "../utils/lineUtils.js";
import { Identifier, IdentifierMap } from "../identifier.js";
import { Expression } from "../expression.js";
import { Scope } from "../scope.js";
import { Instruction } from "../instruction.js";
import { AssemblyLine } from "../lines/assemblyLine.js";
import { InstructionLineList } from "../lines/labeledLineList.js";
import { IndexDefinition, indexConstantConverter } from "./indexDefinition.js";
import { VariableDefinition, ArgVariableDefinition } from "./variableDefinition.js";

export const functionTableEntrySize = 21;

export abstract class AbstractFunction implements Displayable {
    identifier: Identifier;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    argFrameSize: number;
    
    constructor(identifier: Identifier) {
        this.identifier = identifier;
        this.argVariableDefinitionMap = null;
        this.argFrameSize = null;
    }
    
    abstract getId(): number;
    
    abstract getTitlePrefix(): string;
    
    setArgs(args: ArgVariableDefinition[]): void {
        this.argVariableDefinitionMap = new IdentifierMap();
        for (const arg of args) {
            this.argVariableDefinitionMap.setIndexDefinition(arg);
        }
        this.argFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.argVariableDefinitionMap,
        );
    }
    
    getDisplayStringHelper(): string[] {
        return [];
    }
    
    getDisplayString(): string {
        const indentation = niceUtils.getIndentation(1);
        const textList = [
            `${this.getTitlePrefix()} ${this.identifier.name}:`,
            `${indentation}Function ID: ${this.getId()}`,
        ];
        for (const text of this.getDisplayStringHelper()) {
            textList.push(text);
        }
        textList.push(niceUtils.getIdentifierMapDisplayString(
            "Argument variables",
            this.argVariableDefinitionMap,
            1,
        ));
        return niceUtils.joinTextList(textList);
    }
}

export class SpecFunctionType extends AbstractFunction {
    id: number;
    
    constructor(identifier: Identifier, id: number) {
        super(identifier);
        this.id = id;
    }
    
    getId(): number {
        return this.id;
    }
    
    getTitlePrefix(): string {
        return "built-in function type";
    }
}

export abstract class FunctionDefinition extends AbstractFunction {
    idExpression: Expression;
    scope: Scope;
    
    constructor(
        identifier: Identifier,
        idExpression: Expression,
    ) {
        super(identifier);
        this.idExpression = idExpression;
        this.scope = null;
    }
    
    abstract processLines(processLine: LineProcessor): void;
    
    getId(): number {
        return (this.idExpression === null) ? 0 : this.idExpression.evaluateToNumber();
    }
    
    processExpressionsInLines(processExpression: ExpressionProcessor): void {
        this.processLines((line) => {
            line.processExpressions(processExpression);
            return null;
        });
    }
    
    populateScope(parentScope: Scope): void {
        this.scope = new Scope(parentScope);
        this.processExpressionsInLines((expression) => {
            expression.scope = this.scope;
            return null;
        });
    }
    
    extractDefinitions(): void {
        const args: ArgVariableDefinition[] = [];
        this.processLines((line) => {
            const arg = variableUtils.extractArgVariableDefinition(line);
            if (arg !== null) {
                args.push(arg);
                return [];
            }
            return null;
        });
        this.setArgs(args);
    }
    
    populateScopeDefinitions(): void {
        this.scope.indexDefinitionMapList = [this.argVariableDefinitionMap];
    }
}

export class FunctionTypeDefinition extends FunctionDefinition {
    lines: AssemblyLine[];
    
    constructor(
        identifier: Identifier,
        idExpression: Expression,
        lines: AssemblyLine[],
    ) {
        super(identifier, idExpression);
        this.lines = lines;
    }
    
    processLines(processLine: LineProcessor): void {
        lineUtils.processLines(this.lines, processLine);
    }
    
    getTitlePrefix(): string {
        return "function type";
    }
}

export class FunctionImplDefinition extends FunctionDefinition {
    indexDefinition: FunctionIndexDefinition;
    isGuarded: boolean;
    localVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    localFrameSize: number;
    instructionLineList: InstructionLineList;
    instructions: Instruction[];
    
    constructor(
        identifier: Identifier,
        idExpression: Expression,
        isGuarded: boolean,
        lines: AssemblyLine[],
        instructionTypeMap: InstructionTypeMap,
    ) {
        super(identifier, idExpression);
        this.indexDefinition = new FunctionIndexDefinition(this);
        this.isGuarded = isGuarded;
        this.instructionLineList = new InstructionLineList(lines, instructionTypeMap);
        this.localVariableDefinitionMap = null;
        this.localFrameSize = null;
        this.instructions = null;
    }
    
    processLines(processLine: LineProcessor): void {
        this.instructionLineList.processLines(processLine);
    }
    
    extractDefinitions(): void {
        super.extractDefinitions();
        this.extractLocalVariableDefinitions();
        this.instructionLineList.extractLabelDefinitions();
    }
    
    extractLocalVariableDefinitions(): void {
        this.localVariableDefinitionMap = new IdentifierMap();
        this.processLines((line) => {
            const localVar = variableUtils.extractLocalVariableDefinition(line);
            if (localVar !== null) {
                this.localVariableDefinitionMap.setIndexDefinition(localVar);
                return [];
            }
            return null;
        });
        this.localFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.localVariableDefinitionMap,
        );
    }
    
    populateScopeDefinitions(): void {
        super.populateScopeDefinitions();
        this.scope.indexDefinitionMapList.push(
            this.localVariableDefinitionMap,
            this.instructionLineList.labelDefinitionMap,
        );
    }
    
    getTitlePrefix(): string {
        return "function";
    }
    
    getDisplayStringHelper(): string[] {
        const indentation = niceUtils.getIndentation(1);
        const output = [
            `${indentation}Is guarded: ${this.isGuarded}`,
            this.instructionLineList.getDisplayString(
                "Instruction body",
                1,
            ),
        ];
        if (this.instructions !== null) {
            output.push(niceUtils.getDisplayableListDisplayString(
                "Assembled instructions",
                this.instructions,
                1,
            ));
        }
        output.push(niceUtils.getIdentifierMapDisplayString(
            "Local variables",
            this.localVariableDefinitionMap,
            1,
        ));
        return output;
    }
    
    createTableEntryBuffer(instructionsFilePos: number, instructionsSize: number): Buffer {
        const output = Buffer.alloc(functionTableEntrySize);
        output.writeInt32LE(this.getId(), 0);
        output.writeUInt8(this.isGuarded ? 1 : 0, 4);
        output.writeUInt32LE(this.argFrameSize, 5);
        output.writeUInt32LE(this.localFrameSize, 9);
        output.writeUInt32LE(instructionsFilePos, 13);
        output.writeUInt32LE(instructionsSize, 17);
        return output;
    }
    
    createInstructionsBuffer(): Buffer {
        const output = this.instructionLineList.createBuffer();
        this.instructions = this.instructionLineList.serializableLineList as Instruction[];
        return output;
    }
}

export class FunctionIndexDefinition extends IndexDefinition {
    functionImpl: FunctionImplDefinition;
    
    constructor(functionImpl: FunctionImplDefinition) {
        super(functionImpl.identifier, indexConstantConverter);
        this.functionImpl = functionImpl;
    }
    
    getDisplayString(): string {
        return this.functionImpl.getDisplayString();
    }
}


