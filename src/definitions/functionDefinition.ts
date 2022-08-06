
import { LineProcessor, ExpressionProcessor, InstructionTypeMap, Displayable } from "../types.js";
import * as variableUtils from "../utils/variableUtils.js";
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

export class FunctionType {
    identifier: Identifier;
    id: number;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    argFrameSize: number;
    
    constructor(identifier: Identifier) {
        this.identifier = identifier;
        this.id = null
        this.argVariableDefinitionMap = null;
        this.argFrameSize = null;
    }
    
    setArgs(args: ArgVariableDefinition[]): void {
        this.argVariableDefinitionMap = new IdentifierMap();
        for (const arg of args) {
            this.argVariableDefinitionMap.setIndexDefinition(arg);
        }
        this.argFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.argVariableDefinitionMap,
        );
    }
}

export class FunctionIndexDefinition extends IndexDefinition {
    functionImpl: FunctionImplDefinition;
    
    constructor(functionImpl: FunctionImplDefinition) {
        super(functionImpl.type.identifier, indexConstantConverter);
        this.functionImpl = functionImpl;
    }
    
    getDisplayString(): string {
        // TODO: Implement.
        return "(Function Index Definition)";
    }
}

export abstract class FunctionDefinition implements Displayable {
    type: FunctionType;
    idExpression: Expression;
    scope: Scope;
    
    constructor(
        identifier: Identifier,
        idExpression: Expression,
    ) {
        this.type = new FunctionType(identifier);
        this.idExpression = idExpression;
        this.scope = null;
    }
    
    abstract processLines(processLine: LineProcessor): void;
    
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
        this.type.setArgs(args);
    }
    
    populateScopeDefinitions(): void {
        this.scope.indexDefinitionMapList = [this.type.argVariableDefinitionMap];
    }
    
    getDisplayString(): string {
        // TODO: Implement.
        return "(Function Definition)";
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
    
    createTableEntryBuffer(instructionsFilePos: number, instructionsSize: number): Buffer {
        const output = Buffer.alloc(functionTableEntrySize);
        let id: number;
        if (this.idExpression === null) {
            id = 0;
        } else {
            id = this.idExpression.evaluateToNumber();
        }
        output.writeInt32LE(id, 0);
        output.writeUInt8(this.isGuarded ? 1 : 0, 4);
        output.writeUInt32LE(this.type.argFrameSize, 5);
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


