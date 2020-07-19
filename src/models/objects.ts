
import {LineProcessor, ExpressionProcessor, LabelDefinitionClass, MixedNumber} from "models/items";
import {UnaryOperator, BinaryOperator, DataType, NumberType, SignedIntegerType, StringType, InstructionType} from "models/delegates";

export interface Displayable {
    // Concrete subclasses must implement these methods:
    getDisplayString(): string;
}

export interface IndexConverter {
    // Concrete subclasses must implement these methods:
    createConstantOrNull(index: number): Constant;
    createInstructionArgOrNull(indexDefinition: IndexDefinition): InstructionArg;
}

export interface IndexRefConverter {
    instructionRefPrefix: number;
    dataType: DataType;
}

export interface IndexDefinition extends Displayable {
    identifier: Identifier;
    index: number;
    indexConverter: IndexConverter;
    
    createConstantOrNull(): Constant;
    createInstructionArgOrNull(): InstructionArg;
}

export interface Scope {
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[];
    parentScope: Scope;
    
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition;
}

export interface Assembler {
    shouldBeVerbose: boolean;
    rootLineList: AssemblyLine[];
    aliasDefinitionMap: IdentifierMap<AliasDefinition>;
    macroDefinitionMap: {[name: string]: MacroDefinition};
    nextMacroInvocationId: number;
    functionDefinitionMap: IdentifierMap<FunctionDefinition>;
    nextFunctionDefinitionIndex: number;
    scope: Scope;
    globalVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    globalFrameSize: number;
    appDataLineList: AppDataLineList;
    headerBuffer: Buffer;
    functionTableBuffer: Buffer;
    instructionsBuffer: Buffer;
    appDataBuffer: Buffer;
    fileBuffer: Buffer;
    
    getDisplayString(): string;
    processLines(processLine: LineProcessor): void;
    processExpressionsInLines(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
    loadAndParseAssemblyFile(path: string): AssemblyLine[];
    assembleCodeFile(sourcePath: string, destinationPath: string): void;
    extractMacroDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    getNextMacroInvocationId(): number;
    expandMacroInvocations(lineList: AssemblyLine[]): {lineList: AssemblyLine[], expandCount: number};
    processIncludeDirectives(lineList: AssemblyLine[]): {lineList: AssemblyLine[], includeCount: number};
    extractAliasDefinitions(lineList: AssemblyLine[]): AssemblyLine[];
    expandAliasInvocations(): void;
    extractDefinitions(): void;
    extractFunctionDefinitions(): void;
    extractGlobalVariableDefinitions(): void;
    extractAppDataDefinitions(): void;
    populateScopeInRootLines(): void;
    populateScopeDefinitions(): void;
    addFunctionDefinition(functionDefinition: FunctionDefinition): void;
    generateFileBuffer(): void;
}

export interface AssemblyError {
    message: string;
    lineNumber: number;
    filePath: string;
}

export interface AssemblyLine {
    directiveName: string;
    argList: Expression[];
    lineNumber: number;
    codeBlock: AssemblyLine[];
    filePath: string;
    
    copy(): AssemblyLine;
    getDisplayString(indentationLevel: number): string;
    processExpressions(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void;
    assembleInstruction(): Instruction;
    assembleAppData(): AppData;
}

export interface Constant {
    // Concrete subclasses may override these methods:
    compress(signedIntegerTypeList: SignedIntegerType[]): void;
    
    // Concrete subclasses must implement these methods:
    getDataType(): DataType;
    setDataType(dataType: DataType): void;
    copy(): Constant;
    createBuffer(): Buffer;
}

export interface NumberConstant extends Constant {
    value: MixedNumber;
    numberType: NumberType;
}

export interface StringConstant extends Constant {
    value: string;
    stringType: StringType;
}

export interface AliasDefinition extends Displayable {
    identifier: Identifier;
    expression: Expression;
}

export interface Expression {
    line: AssemblyLine;
    scope: Scope;
    constantDataType: DataType;
    
    createError(message: string): AssemblyError;
    handleError(error: Error): void;
    processExpressions(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
    evaluateToIdentifierName(): string;
    evaluateToIdentifier(): Identifier;
    evaluateToIndexDefinitionOrNull(): IndexDefinition;
    evaluateToConstant(): Constant;
    evaluateToNumber(): number;
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression;
    getConstantDataType(): DataType;
    
    // Concrete subclasses may override these methods:
    evaluateToIdentifierNameOrNull(): string;
    evaluateToIdentifierOrNull(): Identifier;
    evaluateToConstantOrNull(): Constant;
    evaluateToString(): string;
    evaluateToDataType(): DataType;
    evaluateToInstructionArg(): InstructionArg;
    evaluateToInstructionRef(): InstructionRef;
    populateMacroInvocationId(macroInvocationId: number): void;
    getConstantDataTypeHelper(): DataType;
    
    // Concrete subclasses must implement these methods:
    copy(): Expression;
    getDisplayString(): string;
    processExpressionsHelper(processExpression: ExpressionProcessor, shouldRecurAfterProcess?: boolean): Expression;
}

export interface ArgTerm extends Expression {
    
}

export interface ArgWord extends ArgTerm {
    text: string;
}

export interface ArgNumber extends ArgTerm {
    constant: NumberConstant;
}

export interface ArgString extends ArgTerm {
    constant: StringConstant;
}

export interface UnaryExpression extends Expression {
    operator: UnaryOperator;
    operand: Expression;
}

export interface MacroIdentifierExpression extends UnaryExpression {
    macroInvocationId: number;
}

export interface BinaryExpression extends Expression {
    operator: BinaryOperator;
    operand1: Expression;
    operand2: Expression;
}

export interface SubscriptExpression extends Expression {
    sequenceExpression: Expression;
    indexExpression: Expression;
    dataTypeExpression: Expression;
}

export interface FunctionImplementation {
    functionDefinition: FunctionDefinition;
    localVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    localFrameSize: number;
    instructionList: Instruction[];
    
    getDisplayString(indentationLevel: number): string;
    getScope(): Scope;
    getLineList(): InstructionLineList;
    processLines(processLine: LineProcessor): void;
    extractDefinitions(): void;
    extractLocalVariableDefinitions(): void;
    populateScopeDefinitions(): void;
    assembleInstructions(): Buffer;
}

export interface FunctionDefinition extends IndexDefinition {
    idExpression: Expression;
    isGuarded: boolean;
    lineList: InstructionLineList;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    argFrameSize: number;
    scope: Scope;
    functionImplementation: FunctionImplementation;
    
    processLines(processLine: LineProcessor): void;
    populateScope(parentScope: Scope): void;
    extractDefinitions(): void;
    extractArgVariableDefinitions(): void;
    populateScopeDefinitions(): void;
    createTableEntryBuffer(
        instructionsFilePos: number,
        instructionsSize: number
    ): Buffer;
    createInstructionsBuffer(): Buffer;
}

export interface Identifier {
    name: string;
    
    getDisplayString(): string;
    getMapKey(): string;
    getIsBuiltIn(): boolean;
    equals(identifier: Identifier): boolean;
}

export interface MacroIdentifier extends Identifier {
    macroInvocationId: number;
}

export interface IdentifierMap<T> {
    map: {[key: string]: T};
    keyList: string[];
    
    get(identifier: Identifier): T;
    set(identifier: Identifier, value: T): void;
    setIndexDefinition(indexDefinition: IndexDefinition): void;
    iterate(handle: (value: T) => void): void;
    getValueList(): T[];
    getSize(): number;
}

export interface LabelDefinition extends IndexDefinition {
    lineIndex: number;
}

export interface MacroDefinition extends Displayable {
    name: string;
    argIdentifierList: Identifier[];
    lineList: AssemblyLine[];
    
    invoke(argList: Expression[], macroInvocationId: number): AssemblyLine[];
}

export interface VariableDefinition extends IndexDefinition {
    dataType: DataType;
    
    getDisplayStringHelper(): string;
}

export interface ArgVariableDefinition extends VariableDefinition {
    
}

export interface LabeledLineList {
    lineList: AssemblyLine[];
    serializableLineList: SerializableLine[];
    labelDefinitionMap: IdentifierMap<LabelDefinition>;
    
    populateScope(scope: Scope): void;
    processLines(processLine: LineProcessor): void;
    getLineBufferIndexMap(): {[lineIndex: number]: number};
    getDisplayString(title: string, indentationLevel?: number): string;
    populateLabelDefinitionIndexes(): void;
    assembleSerializableLines(): void;
    createBuffer(): Buffer;
    
    // Concrete subclasses may override these methods:
    extractLabelDefinitions(): void;
    
    // Concrete subclasses must implement these methods:
    getLabelDefinitionClass(): LabelDefinitionClass;
    assembleSerializableLine(line: AssemblyLine): SerializableLine;
}

export interface InstructionLineList extends LabeledLineList {
    
}

export interface AppDataLineList extends LabeledLineList {
    
}

export interface SerializableLine extends Displayable {
    getBufferLength(): number;
    createBuffer(): Buffer;
}

export interface AppData extends SerializableLine {
    expressionList: Expression[];
}

export interface Instruction extends SerializableLine {
    instructionType: InstructionType;
    argList: InstructionArg[];
}

export interface InstructionRef {
    argPrefix: number;
    
    // Concrete subclasses may override these methods:
    getBufferLength(indexArg: InstructionArg): number;
    createBuffer(dataType: DataType, indexArg: InstructionArg): Buffer;
}

export interface PointerInstructionRef extends InstructionRef {
    pointerArg: InstructionArg;
}

export interface InstructionArg {
    getDisplayString(): string;
    
    // Concrete subclasses must implement these methods:
    getDataType(): DataType;
    setDataType(dataType: DataType): void;
    getBufferLength(): number;
    createBuffer(): Buffer;
}

export interface ConstantInstructionArg extends InstructionArg {
    // Concrete subclasses must implement these methods:
    getConstant(): Constant;
}

export interface ResolvedConstantInstructionArg extends ConstantInstructionArg {
    constant: Constant;
}

export interface IndexInstructionArg extends ConstantInstructionArg {
    indexDefinition: IndexDefinition;
    dataType: DataType;
}

export interface RefInstructionArg extends InstructionArg {
    instructionRef: InstructionRef;
    dataType: DataType;
    indexArg: InstructionArg;
}


