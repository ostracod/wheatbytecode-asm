
import { ExpressionProcessor, Displayable } from "./types.js";
import * as dataTypeUtils from "./utils/dataTypeUtils.js";
import { compressibleIntegerType, instructionDataTypeList, DataType } from "./delegates/dataType.js";
import { macroIdentifierOperator, UnaryOperator, BinaryOperator } from "./delegates/operator.js";
import { AssemblyError, UnresolvedIndexError } from "./assemblyError.js";
import { Identifier, MacroIdentifier, IdentifierMap } from "./identifier.js";
import { InstructionRef, PointerInstructionRef, InstructionArg, ResolvedConstantInstructionArg, ExpressionInstructionArg, RefInstructionArg, instructionRefMap } from "./instruction.js";
import { Constant, NumberConstant, StringConstant } from "./constant.js";
import { Scope } from "./scope.js";
import { AssemblyLine } from "./lines/assemblyLine.js";
import { IndexDefinition } from "./definitions/indexDefinition.js";
import { ArgVariableDefinition, NextArgDefinition } from "./definitions/variableDefinition.js";
import { AbstractFunction } from "./definitions/functionDefinition.js";

export abstract class Expression implements Displayable {
    line: AssemblyLine;
    scope: Scope;
    constantDataType: DataType;
    
    constructor() {
        this.line = null;
        this.scope = null;
        // We cache this value so that we can verify
        // the output of evaluateToConstant.
        // Use Expression.getConstantDataType to cache
        // and retrieve this value.
        this.constantDataType = null;
    }
    
    abstract copy(): Expression;
    
    abstract getDisplayString(): string;
    
    abstract processExpressionsHelper(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean,
    ): Expression;
    
    createError(message: string): AssemblyError {
        throw new AssemblyError(message, this.line.lineNumber, this.line.filePath);
    }
    
    handleError(error: Error): void {
        if (error instanceof AssemblyError) {
            error.populateLine(this.line);
        }
    }
    
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        if (typeof shouldRecurAfterProcess === "undefined") {
            shouldRecurAfterProcess = false;
        }
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let output: Expression = this;
        while (true) {
            const tempResult = output.processExpressionsHelper(processExpression, shouldRecurAfterProcess);
            if (tempResult === null) {
                return output;
            }
            output = tempResult;
            if (!shouldRecurAfterProcess) {
                break;
            }
        }
        return output;
    }
    
    evaluateToIdentifierName(): string {
        const output = this.evaluateToIdentifierNameOrNull();
        if (output === null) {
            throw this.createError("Expected identifier name.");
        }
        return output;
    }
    
    evaluateToIdentifier(): Identifier {
        const output = this.evaluateToIdentifierOrNull();
        if (output === null) {
            throw this.createError("Expected identifier.");
        }
        return output;
    }
    
    evaluateToIndexDefinitionOrNull(): IndexDefinition {
        const tempIdentifier = this.evaluateToIdentifierOrNull();
        if (tempIdentifier === null) {
            return null;
        }
        return this.scope.getIndexDefinition(tempIdentifier);
    }
    
    evaluateToFunctionOrNull(): AbstractFunction {
        const identifier = this.evaluateToIdentifierOrNull();
        if (identifier === null) {
            return null;
        }
        return this.scope.getFunction(identifier);
    }
    
    evaluateToArgMapOrNull(): IdentifierMap<ArgVariableDefinition> {
        return null;
    }
    
    evaluateToConstant(): Constant {
        const output = this.evaluateToConstantOrNull();
        if (output === null) {
            throw this.createError("Expected constant.");
        }
        if (this.constantDataType !== null
                && !this.constantDataType.equals(output.getDataType())) {
            throw this.createError("Constant has inconsistent data type.");
        }
        return output;
    }
    
    evaluateToNumber(): number {
        const tempConstant = this.evaluateToConstantOrNull();
        if (tempConstant === null || !(tempConstant instanceof NumberConstant)) {
            throw this.createError("Expected number constant.");
        }
        const tempNumberConstant = tempConstant as NumberConstant;
        return Number(tempNumberConstant.value);
    }
    
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression {
        const tempIdentifier = this.evaluateToIdentifierOrNull();
        if (tempIdentifier === null) {
            return null;
        }
        const tempExpression = identifierExpressionMap.get(tempIdentifier);
        if (tempExpression === null) {
            return null;
        }
        return tempExpression.copy();
    }
    
    getConstantDataType(): DataType {
        if (this.constantDataType === null) {
            this.constantDataType = this.getConstantDataTypeHelper();
        }
        return this.constantDataType;
    }
    
    evaluateToIdentifierNameOrNull(): string {
        return null;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        const identifier = this.evaluateToIdentifierOrNull();
        if (identifier !== null) {
            const constant = this.scope.getBuiltInConstant(identifier);
            if (constant !== null) {
                return constant.copy();
            }
        }
        const definition = this.evaluateToIndexDefinitionOrNull();
        if (definition !== null) {
            return definition.createConstantOrNull();
        }
        return null;
    }
    
    evaluateToString(): string {
        const tempConstant = this.evaluateToConstantOrNull();
        if (tempConstant === null || !(tempConstant instanceof StringConstant)) {
            throw this.createError("Expected string.");
        }
        const tempStringConstant = tempConstant as StringConstant;
        return tempStringConstant.value;
    }
    
    evaluateToDataType(): DataType {
        throw this.createError("Expected data type.");
    }
    
    evaluateToInstructionArg(): InstructionArg {
        const tempDefinition = this.evaluateToIndexDefinitionOrNull();
        if (tempDefinition !== null) {
            const tempResult = tempDefinition.createInstructionArgOrNull();
            if (tempResult !== null) {
                return tempResult;
            }
        }
        try {
            const tempConstant = this.evaluateToConstantOrNull();
            if (tempConstant !== null) {
                tempConstant.compress(instructionDataTypeList);
                return new ResolvedConstantInstructionArg(tempConstant);
            }
        } catch (error) {
            if (error instanceof UnresolvedIndexError) {
                return new ExpressionInstructionArg(this);
            }
        }
        const identifier = this.evaluateToIdentifierOrNull();
        if (identifier !== null) {
            const tempArg = this.scope.getMiscInstructionArg(identifier);
            if (tempArg !== null) {
                return tempArg;
            }
            if (!this.scope.identifierIsKnown(identifier)) {
                throw this.createError(`Unknown identifier "${identifier.getDisplayString()}".`);
            }
        }
        throw this.createError(`Cannot use "${this.getDisplayString()}" as instruction argument.`);
    }
    
    evaluateToInstructionRef(): InstructionRef {
        const identifier = this.evaluateToIdentifierOrNull();
        if (identifier !== null) {
            const instructionRef = this.scope.getInstructionRef(identifier);
            if (instructionRef !== null) {
                return instructionRef;
            }
        }
        const arg = this.evaluateToInstructionArg();
        return new PointerInstructionRef(arg);
    }
    
    populateMacroInvocationId(macroInvocationId: number): void {
        // Do nothing.
    }
    
    getConstantDataTypeHelper(): DataType {
        throw this.createError("Expected constant value.");
    }
}

export abstract class ArgTerm extends Expression {
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        const tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        return null;
    }
}

export class ArgWord extends ArgTerm {
    text: string;
    
    constructor(text: string) {
        super();
        this.text = text;
    }
    
    copy(): Expression {
        return new ArgWord(this.text);
    }
    
    getDisplayString(): string {
        return this.text;
    }
    
    evaluateToIdentifierNameOrNull(): string {
        return this.text;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        return new Identifier(this.text);
    }
    
    evaluateToDataType(): DataType {
        return dataTypeUtils.getDataTypeByName(this.text);
    }
    
    getConstantDataTypeHelper(): DataType {
        return compressibleIntegerType;
    }
}

export class ArgNumber extends ArgTerm {
    constant: NumberConstant;
    
    constructor(constant: NumberConstant) {
        super();
        this.constant = constant;
    }
    
    copy(): Expression {
        return new ArgNumber(this.constant.copy() as NumberConstant);
    }
    
    getDisplayString(): string {
        return this.constant.value + "";
    }
    
    evaluateToConstantOrNull(): Constant {
        return this.constant.copy();
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.constant.numberType;
    }
}

export class ArgString extends ArgTerm {
    constant: StringConstant;
    
    constructor(value: string) {
        super();
        this.constant = new StringConstant(value);
    }
    
    copy(): Expression {
        return new ArgString(this.constant.value);
    }
    
    getDisplayString(): string {
        return `"${this.constant.value}"`;
    }
    
    evaluateToConstantOrNull(): Constant {
        return this.constant;
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.constant.getDataType();
    }
}

export abstract class UnaryExpression extends Expression {
    operand: Expression;
    
    constructor(operand: Expression) {
        super();
        this.operand = operand;
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        const result = processExpression(this);
        if (result !== null) {
            return result;
        }
        this.operand = this.operand.processExpressions(processExpression, shouldRecurAfterProcess);
        return null;
    }
}

export class UnaryOperatorExpression extends UnaryExpression {
    operator: UnaryOperator;
    
    constructor(operator: UnaryOperator, operand: Expression) {
        super(operand);
        this.operator = operator;
    }
    
    copy(): Expression {
        return new UnaryOperatorExpression(this.operator, this.operand.copy());
    }
    
    getDisplayString(): string {
        return this.operator.text + this.operand.getDisplayString();
    }
    
    evaluateToConstantOrNull(): Constant {
        let tempResult;
        try {
            tempResult = this.operator.createConstantOrNull(this.operand);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
        if (tempResult === null) {
            return super.evaluateToConstantOrNull();
        } else {
            return tempResult;
        }
    }
    
    getConstantDataTypeHelper(): DataType {
        try {
            return this.operator.getConstantDataType(this.operand);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }
}

export class MacroIdentifierExpression extends UnaryOperatorExpression {
    macroInvocationId: number;
    
    constructor(operand: Expression) {
        super(macroIdentifierOperator, operand);
        this.macroInvocationId = null;
    }
    
    copy(): Expression {
        const output = new MacroIdentifierExpression(this.operand.copy());
        output.macroInvocationId = this.macroInvocationId;
        return output;
    }
    
    getDisplayString(): string {
        if (this.macroInvocationId === null) {
            return super.getDisplayString();
        }
        return `${this.operator.text}{${this.macroInvocationId}}${this.operand.getDisplayString()}`;
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        if (!(this.operand instanceof ArgTerm)) {
            return null;
        }
        const tempName = this.operand.evaluateToIdentifierName();
        return new MacroIdentifier(tempName, this.macroInvocationId);
    }
    
    populateMacroInvocationId(macroInvocationId: number): void {
        if (this.macroInvocationId === null) {
            this.macroInvocationId = macroInvocationId;
        }
    }
}

export class MemberAccessExpression extends UnaryExpression {
    memberName: string;
    
    constructor(operand: Expression, memberName: string) {
        super(operand);
        this.memberName = memberName;
    }
    
    copy(): Expression {
        return new MemberAccessExpression(this.operand.copy(), this.memberName);
    }
    
    getDisplayString(): string {
        return `(${this.operand.getDisplayString()}.${this.memberName})`;
    }
    
    evaluateToIndexDefinitionOrNull(): IndexDefinition {
        const argMap = this.operand.evaluateToArgMapOrNull();
        if (argMap !== null) {
            const identifier = new Identifier(this.memberName);
            const definition = argMap.get(identifier);
            if (definition === null) {
                throw this.createError(`Could not find an argument named "${this.memberName}".`);
            }
            return new NextArgDefinition(definition);
        }
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        const resultFunction = this.operand.evaluateToFunctionOrNull();
        if (resultFunction !== null) {
            let value: number = null;
            if (this.memberName === "id") {
                value = resultFunction.getId();
            } else if (this.memberName === "argsSize") {
                value = resultFunction.argFrameSize;
            }
            if (value !== null) {
                return new NumberConstant(value, compressibleIntegerType);
            }
        }
        return null;
    }
    
    evaluateToArgMapOrNull(): IdentifierMap<ArgVariableDefinition> {
        if (this.memberName !== "args") {
            return null;
        }
        const resultFunction = this.operand.evaluateToFunctionOrNull();
        return (resultFunction === null) ? null : resultFunction.argVariableDefinitionMap;
    }
}

export class BinaryExpression extends Expression {
    operator: BinaryOperator;
    operand1: Expression;
    operand2: Expression;
    
    constructor(operator: BinaryOperator, operand1: Expression, operand2: Expression) {
        super();
        this.operator = operator;
        this.operand1 = operand1;
        this.operand2 = operand2;
    }
    
    copy(): Expression {
        return new BinaryExpression(
            this.operator,
            this.operand1.copy(),
            this.operand2.copy(),
        );
    }
    
    getDisplayString(): string {
        return `(${this.operand1.getDisplayString()} ${this.operator.text} ${this.operand2.getDisplayString()})`;
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        const tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        this.operand1 = this.operand1.processExpressions(processExpression, shouldRecurAfterProcess);
        this.operand2 = this.operand2.processExpressions(processExpression, shouldRecurAfterProcess);
        return null;
    }
    
    evaluateToConstantOrNull(): Constant {
        let tempResult;
        try {
            tempResult = this.operator.createConstantOrNull(this.operand1, this.operand2);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
        if (tempResult === null) {
            return super.evaluateToConstantOrNull();
        } else {
            return tempResult;
        }
    }
    
    evaluateToIdentifierOrNull(): Identifier {
        try {
            return this.operator.createIdentifierOrNull(this.operand1, this.operand2);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    
    evaluateToInstructionArg(): InstructionArg {
        let tempResult;
        try {
            tempResult = this.operator.createInstructionArgOrNull(this.operand1, this.operand2);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
        if (tempResult !== null) {
            return tempResult;
        }
        return super.evaluateToInstructionArg();
    }
    
    getConstantDataTypeHelper(): DataType {
        try {
            return this.operator.getConstantDataType(this.operand1, this.operand2);
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }
}

export class SubscriptExpression extends Expression {
    sequenceExpression: Expression;
    indexExpression: Expression;
    dataTypeExpression: Expression;
    
    constructor(
        sequenceExpression: Expression,
        indexExpression: Expression,
        dataTypeExpression: Expression,
    ) {
        super();
        this.sequenceExpression = sequenceExpression;
        this.indexExpression = indexExpression;
        this.dataTypeExpression = dataTypeExpression;
    }
    
    copy(): Expression {
        return new SubscriptExpression(
            this.sequenceExpression.copy(),
            this.indexExpression.copy(),
            this.dataTypeExpression.copy(),
        );
    }
    
    getDisplayString(): string {
        return `(${this.sequenceExpression.getDisplayString()}[${this.indexExpression.getDisplayString()}]:${this.dataTypeExpression.getDisplayString()})`;
    }
    
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression {
        const tempResult = processExpression(this);
        if (tempResult !== null) {
            return tempResult;
        }
        this.sequenceExpression = this.sequenceExpression.processExpressions(
            processExpression,
            shouldRecurAfterProcess,
        );
        this.indexExpression = this.indexExpression.processExpressions(
            processExpression,
            shouldRecurAfterProcess,
        );
        this.dataTypeExpression = this.dataTypeExpression.processExpressions(
            processExpression,
            shouldRecurAfterProcess,
        );
        return null;
    }
    
    evaluateToInstructionArg(): InstructionArg {
        return new RefInstructionArg(
            this.sequenceExpression.evaluateToInstructionRef(),
            this.dataTypeExpression.evaluateToDataType(),
            this.indexExpression.evaluateToInstructionArg(),
        );
    }
    
    getConstantDataTypeHelper(): DataType {
        return this.dataTypeExpression.evaluateToDataType();
    }
}


