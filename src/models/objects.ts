
import {LineProcessor, ExpressionProcessor, LabelDefinitionClass, MixedNumber} from "models/items";
import {UnaryOperator, BinaryOperator, DataType, NumberType, StringType, InstructionType} from "models/delegates";

export interface Displayable {
    // Concrete subclasses must implement these methods:
    getDisplayString(): string;
}

export interface IndexConverter {
    // Concrete subclasses must implement these methods:
    createConstantOrNull(index: number): Constant;
    createInstructionArgOrNull(index: number): InstructionArg;
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

export interface ArgPerm {
    access: number;
    recipient: number;
    hasAttributeMap: {[attribute: string]: boolean};
    
    getDisplayString(): string;
    createBuffer(index: number): Buffer;
}

export interface Scope {
    indexDefinitionMapList: IdentifierMap<IndexDefinition>[];
    publicFunctionDefinitionList: PublicFunctionDefinition[];
    parentScope: Scope;
    
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition;
    getPublicFunctionDefinition(
        identifier: Identifier,
        interfaceIndex: number
    ): PublicFunctionDefinition;
}

export interface Assembler {
    rootRegionType: number;
    funcsRegionType: number;
    shouldBeVerbose: boolean;
    rootLineList: AssemblyLine[];
    aliasDefinitionMap: IdentifierMap<AliasDefinition>;
    macroDefinitionMap: {[name: string]: MacroDefinition};
    functionDefinitionList: FunctionDefinition[];
    dependencyDefinitionMap: IdentifierMap<DependencyDefinition>;
    nextMacroInvocationId: number;
    scope: Scope;
    fileFormatVersionNumber: VersionNumber;
    descriptionLineList: string[];
    fileRegion: Region;
    
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
    populateScopeInRootLines(): void;
    addFunctionDefinition(functionDefinition: FunctionDefinition): void;
    addDependencyDefinition(dependencyDefinition: DependencyDefinition): void;
    extractDependencyDefinitions(): void;
    extractFileFormatVersionNumber(): void;
    extractDescriptionLines(): void;
    generateFileRegion(): void;
    
    // Concrete subclasses may override these methods:
    getDisplayString(): string;
    extractDefinitions(): void;
    populateScopeDefinitions(): void;
    createFileSubregions(): Region[];
    
    // Concrete subclasses must implement these methods:
    extractFunctionDefinitions(): void;
}

export interface BytecodeAppAssembler extends Assembler {
    privateFunctionDefinitionMap: IdentifierMap<PrivateFunctionDefinition>;
    publicFunctionDefinitionList: PublicFunctionDefinition[];
    appDataLineList: DataLineList;
    globalVariableDefinitionMap: IdentifierMap<VariableDefinition>;
    globalFrameLength: FrameLength;
    
    extractAppDataDefinitions(): void;
    extractGlobalVariableDefinitions(): void;
}

export interface InterfaceAssembler extends Assembler {
    
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
}

export interface Constant {
    // Concrete subclasses may override these methods:
    compress(): void;
    
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
    evaluateToIdentifier(): Identifier;
    evaluateToIndexDefinitionOrNull(): IndexDefinition;
    evaluateToConstant(): Constant;
    evaluateToNumber(): number;
    evaluateToDependencyModifier(): number;
    substituteIdentifiers(identifierExpressionMap: IdentifierMap<Expression>): Expression;
    getConstantDataType(): DataType;
    
    // Concrete subclasses may override these methods:
    evaluateToIdentifierName(): string;
    evaluateToIdentifierOrNull(): Identifier;
    evaluateToConstantOrNull(): Constant;
    evaluateToString(): string;
    evaluateToDataType(): DataType;
    evaluateToArgPerm(): ArgPerm;
    evaluateToVersionNumber(): VersionNumber;
    evaluateToDependencyModifierOrNull(): number;
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

export interface ArgVersionNumber extends ArgTerm {
    versionNumber: VersionNumber;
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
    localFrameLength: FrameLength;
    instructionList: Instruction[];
    jumpTableLineList: DataLineList;
    
    getDisplayString(indentationLevel: number): string;
    getScope(): Scope;
    getLineList(): InstructionLineList;
    processLines(processLine: LineProcessor): void;
    extractDefinitions(): void;
    extractJumpTables(): void;
    extractLocalVariableDefinitions(): void;
    extractLabelDefinitions(): void;
    populateScopeDefinitions(): void;
    assembleInstructions(): void;
    createSubregions(): Region[];
}

export interface FunctionDefinition extends IndexDefinition {
    lineList: InstructionLineList;
    regionType: number;
    argVariableDefinitionMap: IdentifierMap<ArgVariableDefinition>;
    argFrameLength: FrameLength;
    descriptionLineList: string[];
    scope: Scope;
    functionImplementation: FunctionImplementation;
    
    processLines(processLine: LineProcessor): void;
    populateScope(parentScope: Scope): void;
    extractDefinitions(): void;
    extractArgVariableDefinitions(): void;
    extractDescriptionLines(): void;
    populateScopeDefinitions(): void;
    createRegion(): Region;
    
    // Concrete subclasses may override these methods:
    createSubregions(): Region[];
    getTitleSuffix(): string;
    
    // Concrete subclasses must implement these methods:
    getTitlePrefix(): string;
    
}

export interface PrivateFunctionDefinition extends FunctionDefinition {
    
}

export interface ArgPermFunctionDefinition extends FunctionDefinition {
    getArgPermsRegion(): Region;
}

export interface PublicFunctionDefinition extends ArgPermFunctionDefinition {
    interfaceIndexExpression: Expression;
    arbiterIndexExpression: Expression;
}

export interface GuardFunctionDefinition extends ArgPermFunctionDefinition {
    interfaceIndexExpression: Expression;
}

export interface InterfaceFunctionDefinition extends ArgPermFunctionDefinition {
    arbiterIndexExpression: Expression;
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
}

export interface ArgVariableDefinition extends VariableDefinition {
    permList: ArgPerm[];
}

export interface LabeledLineList {
    lineList: AssemblyLine[];
    labelDefinitionMap: IdentifierMap<LabelDefinition>;
    
    populateScope(scope: Scope): void;
    processLines(processLine: LineProcessor): void;
    getLineElementIndexMap(): {[lineIndex: number]: number};
    getDisplayString(title: string, indentationLevel?: number): string;
    
    // Concrete subclasses may override these methods:
    extractLabelDefinitions(): void;
    
    // Concrete subclasses must implement these methods:
    getLabelDefinitionClass(): LabelDefinitionClass;
    getLineElementLength(line: AssemblyLine): number;
}

export interface InstructionLineList extends LabeledLineList {
    assembleInstructions(): Instruction[];
}

export interface DataLineList extends LabeledLineList {
    createBuffer(): Buffer;
    
    // Concrete subclasses must implement these methods:
    convertExpressionToConstant(expression: Expression): Constant;
}

export interface Instruction extends Displayable {
    instructionType: InstructionType;
    argList: InstructionArg[];
    
    createBuffer(): Buffer;
}

export interface InstructionRef {
    argPrefix: number;
    
    // Concrete subclasses may override these methods:
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
    createBuffer(): Buffer;
}

export interface ConstantInstructionArg extends InstructionArg {
    constant: Constant;
}

export interface RefInstructionArg extends InstructionArg {
    instructionRef: InstructionRef;
    dataType: DataType;
    indexArg: InstructionArg;
}

export interface Region {
    regionType: number;
    
    createBuffer(): Buffer;
    getDisplayString(indentationLevel?: number): string;
    
    // Concrete subclasses must implement these methods:
    getContentBuffer(): Buffer;
    getDisplayStringHelper(indentationLevel: number): string[];
}

export interface AtomicRegion extends Region {
    contentBuffer: Buffer;
}

export interface CompositeRegion extends Region {
    regionList: Region[];
}

export interface FrameLength {
    alphaLength: number;
    betaLength: number;
    
    createBuffer(): Buffer;
}

export interface VersionNumber {
    majorNumber: number;
    minorNumber: number;
    patchNumber: number;
    
    copy(): VersionNumber;
    getDisplayString(): string;
    createBuffer(): Buffer;
}

export interface DependencyDefinition extends IndexDefinition {
    regionType: number;
    path: string;
    dependencyModifierList: number[];
    
    createRegion(): Region;
    
    // Concrete subclasses may override these methods:
    getDisplayStringHelper(): string;
    createRegionHelper(): Region[];
}

export interface VersionDependencyDefinition extends DependencyDefinition {
    versionNumber: VersionNumber;
}

export interface InterfaceDependencyDefinition extends DependencyDefinition {
    dependencyExpressionList: Expression[];
}


