
import * as fs from "fs";
import { strict as assert } from "assert";
import { LineProcessor, ExpressionProcessor, Displayable } from "./types.js";
import * as parseUtils from "./utils/parseUtils.js";
import * as lineUtils from "./utils/lineUtils.js";
import * as variableUtils from "./utils/variableUtils.js";
import * as niceUtils from "./utils/niceUtils.js";
import { AssemblyError } from "./assemblyError.js";
import { IdentifierMap } from "./identifier.js";
import { Scope } from "./scope.js";
import { AssemblyLine } from "./lines/assemblyLine.js";
import { AppDataLineList } from "./lines/labeledLineList.js";
import { MacroDefinition } from "./definitions/macroDefinition.js";
import { AliasDefinition } from "./definitions/aliasDefinition.js";
import { VariableDefinition } from "./definitions/variableDefinition.js";
import { FunctionDefinition, functionTableEntrySize } from "./definitions/functionDefinition.js";

const fileHeaderSize = 12;

export class Assembler implements Displayable {
    shouldBeVerbose: boolean;
    rootLineList: AssemblyLine[];
    aliasDefinitionMap: IdentifierMap<AliasDefinition>;
    macroDefinitionMap: { [name: string]: MacroDefinition };
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
    
    constructor(shouldBeVerbose: boolean) {
        this.shouldBeVerbose = shouldBeVerbose;
        this.rootLineList = [];
        this.aliasDefinitionMap = new IdentifierMap();
        this.macroDefinitionMap = {};
        this.nextMacroInvocationId = 0;
        this.functionDefinitionMap = new IdentifierMap();
        this.nextFunctionDefinitionIndex = 0;
        this.scope = new Scope();
        this.globalVariableDefinitionMap = new IdentifierMap();
        this.globalFrameSize = null;
        this.appDataLineList = null;
        this.headerBuffer = null;
        this.functionTableBuffer = null;
        this.instructionsBuffer = null;
        this.appDataBuffer = null;
        this.fileBuffer = null;
    }
    
    getDisplayString(): string {
        const tempTextList = [];
        tempTextList.push("\n= = = GLOBAL VARIABLE DEFINITIONS = = =\n");
        this.globalVariableDefinitionMap.iterate((variableDefinition) => {
            tempTextList.push(variableDefinition.getDisplayString());
        });
        tempTextList.push("\n= = = APP DATA LINE LIST = = =\n");
        tempTextList.push(this.appDataLineList.getDisplayString("Data body"));
        tempTextList.push("\n= = = ALIAS DEFINITIONS = = =\n");
        this.aliasDefinitionMap.iterate((definition) => {
            tempTextList.push(definition.getDisplayString());
        });
        tempTextList.push("\n= = = MACRO DEFINITIONS = = =\n");
        for (const name in this.macroDefinitionMap) {
            const tempDefinition = this.macroDefinitionMap[name];
            tempTextList.push(tempDefinition.getDisplayString());
            tempTextList.push("");
        }
        tempTextList.push("= = = FUNCTION DEFINITIONS = = =\n");
        this.functionDefinitionMap.iterate((definition) => {
            tempTextList.push(definition.getDisplayString());
            tempTextList.push("");
        });
        tempTextList.push("\n= = = FILE BUFFERS = = =\n");
        tempTextList.push(niceUtils.getBufferDisplayString(
            "Header",
            this.headerBuffer,
        ));
        tempTextList.push(niceUtils.getBufferDisplayString(
            "Function table",
            this.functionTableBuffer,
        ));
        tempTextList.push(niceUtils.getBufferDisplayString(
            "Instructions",
            this.instructionsBuffer,
        ));
        tempTextList.push(niceUtils.getBufferDisplayString(
            "App data",
            this.appDataBuffer,
        ));
        return tempTextList.join("\n");
    }
    
    processLines(processLine: LineProcessor): void {
        const tempResult = lineUtils.processLines(this.rootLineList, processLine);
        this.rootLineList = tempResult.lineList;
    }
    
    processExpressionsInLines(
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean,
    ): void {
        lineUtils.processExpressionsInLines(this.rootLineList, processExpression, shouldRecurAfterProcess);
    }
    
    extractMacroDefinitions(lineList: AssemblyLine[]): AssemblyLine[] {
        const tempResult = lineUtils.processLines(lineList, (line) => {
            const tempArgList = line.argList;
            if (line.directiveName === "MACRO") {
                if (tempArgList.length < 1) {
                    throw new AssemblyError("Expected at least 1 argument.");
                }
                const tempNameIdentifier = tempArgList[0].evaluateToIdentifier();
                const tempName = tempNameIdentifier.name;
                const tempIdentifierList = [];
                for (let index = 1; index < tempArgList.length; index++) {
                    const tempIdentifier = tempArgList[index].evaluateToIdentifier();
                    tempIdentifierList.push(tempIdentifier);
                }
                const tempDefinition = new MacroDefinition(
                    tempName,
                    tempIdentifierList,
                    line.codeBlock,
                );
                this.macroDefinitionMap[tempName] = tempDefinition;
                return [];
            }
            return null;
        });
        return tempResult.lineList;
    }
    
    getNextMacroInvocationId(): number {
        const output = this.nextMacroInvocationId;
        this.nextMacroInvocationId += 1;
        return output;
    }
    
    expandMacroInvocations(lineList: AssemblyLine[]): { lineList: AssemblyLine[], expandCount: number } {
        const tempResult = lineUtils.processLines(lineList, (line) => {
            const tempDirectiveName = line.directiveName;
            if (tempDirectiveName in this.macroDefinitionMap) {
                const tempDefinition = this.macroDefinitionMap[tempDirectiveName];
                const macroInvocationId = this.getNextMacroInvocationId();
                return tempDefinition.invoke(line.argList, macroInvocationId);
            }
            return null;
        }, true);
        return {
            lineList: tempResult.lineList,
            expandCount: tempResult.processCount,
        };
    }
    
    extractAliasDefinitions(lineList: AssemblyLine[]): AssemblyLine[] {
        const tempResult = lineUtils.processLines(lineList, (line) => {
            const tempArgList = line.argList;
            if (line.directiveName === "DEF") {
                if (tempArgList.length !== 2) {
                    throw new AssemblyError("Expected 2 arguments.");
                }
                const tempIdentifier = tempArgList[0].evaluateToIdentifier();
                const tempExpression = tempArgList[1];
                const tempDefinition = new AliasDefinition(tempIdentifier, tempExpression);
                this.aliasDefinitionMap.set(tempIdentifier, tempDefinition);
                return [];
            }
            return null;
        });
        return tempResult.lineList;
    }
    
    expandAliasInvocations(): void {
        this.processExpressionsInLines((expression) => {
            const tempIdentifier = expression.evaluateToIdentifierOrNull();
            if (tempIdentifier === null) {
                return null;
            }
            const tempDefinition = this.aliasDefinitionMap.get(tempIdentifier);
            if (tempDefinition === null) {
                return null;
            }
            return tempDefinition.expression.copy();
        }, true);
    }
    
    processIncludeDirectives(lineList: AssemblyLine[]): { lineList: AssemblyLine[], includeCount: number } {
        const tempResult = lineUtils.processLines(lineList, (line) => {
            const tempArgList = line.argList;
            if (line.directiveName === "INCLUDE") {
                if (tempArgList.length !== 1) {
                    throw new AssemblyError("Expected 1 argument.");
                }
                const tempPath = tempArgList[0].evaluateToString();
                return this.loadAndParseAssemblyFile(tempPath);
            }
            return null;
        });
        return {
            lineList: tempResult.lineList,
            includeCount: tempResult.processCount,
        };
    }
    
    loadAndParseAssemblyFile(path: string): AssemblyLine[] {
        const tempLineTextList = parseUtils.loadAssemblyFileContent(path);
        let tempLineList;
        try {
            tempLineList = parseUtils.parseAssemblyLines(tempLineTextList);
            for (const line of tempLineList) {
                line.filePath = path;
            }
            tempLineList = parseUtils.collapseCodeBlocks(tempLineList);
        } catch (error) {
            if (error instanceof AssemblyError) {
                error.filePath = path;
            }
            throw error;
        }
        tempLineList = this.extractMacroDefinitions(tempLineList);
        // We do all of this in a loop because included files may define
        // macros, and macros may define INCLUDE directives.
        while (true) {
            const tempResult1 = this.expandMacroInvocations(tempLineList);
            tempLineList = tempResult1.lineList;
            const tempExpandCount = tempResult1.expandCount;
            tempLineList = this.extractAliasDefinitions(tempLineList);
            const tempResult2 = this.processIncludeDirectives(tempLineList);
            tempLineList = tempResult2.lineList;
            const tempIncludeCount = tempResult2.includeCount;
            if (tempExpandCount <= 0 && tempIncludeCount <= 0) {
                break;
            }
        }
        return tempLineList;
    }
    
    populateScopeInRootLines(): void {
        this.processExpressionsInLines((expression) => {
            expression.scope = this.scope;
            return null;
        });
    }
    
    addFunctionDefinition(functionDefinition: FunctionDefinition): void {
        functionDefinition.index = this.nextFunctionDefinitionIndex;
        this.nextFunctionDefinitionIndex += 1;
        functionDefinition.populateScope(this.scope);
        functionDefinition.extractDefinitions();
        functionDefinition.populateScopeDefinitions();
        this.functionDefinitionMap.setIndexDefinition(functionDefinition);
    }
    
    extractDefinitions(): void {
        this.extractFunctionDefinitions();
        this.extractGlobalVariableDefinitions();
        this.extractAppDataDefinitions();
    }
    
    extractFunctionDefinitions(): void {
        this.processLines((line) => {
            const tempDirectiveName = line.directiveName;
            const tempArgList = line.argList;
            const tempArgCount = tempArgList.length;
            if (tempDirectiveName === "FUNC") {
                if (tempArgCount < 1 || tempArgCount > 3) {
                    throw new AssemblyError("Expected between 1 and 3 arguments.");
                }
                const tempIdentifier = tempArgList[0].evaluateToIdentifier();
                let tempIsGuarded;
                let tempIdIndex;
                if (tempArgCount >= 2) {
                    const tempExpression = tempArgList[tempArgCount - 1];
                    const tempName = tempExpression.evaluateToIdentifierNameOrNull();
                    tempIsGuarded = (tempName !== null && tempName === "guarded");
                    if (tempIsGuarded) {
                        tempIdIndex = tempArgCount - 2;
                    } else {
                        tempIdIndex = tempArgCount - 1;
                    }
                } else {
                    tempIsGuarded = false;
                    tempIdIndex = null;
                }
                let tempIdExpression = null;
                if (tempIdIndex !== null) {
                    if (tempIdIndex > 1) {
                        throw new AssemblyError("Unexpected expression.");
                    } else if (tempIdIndex > 0) {
                        tempIdExpression = tempArgList[tempIdIndex];
                    }
                }
                const tempDefinition = new FunctionDefinition(
                    tempIdentifier,
                    tempIdExpression,
                    tempIsGuarded,
                    line.codeBlock,
                );
                this.addFunctionDefinition(tempDefinition);
                return [];
            }
            return null;
        });
    }
    
    extractAppDataDefinitions(): void {
        const tempLineList = [];
        this.processLines((line) => {
            if (line.directiveName === "APP_DATA") {
                if (line.argList.length !== 0) {
                    throw new AssemblyError("Expected 0 arguments.");
                }
                for (const tempLine of line.codeBlock) {
                    tempLineList.push(tempLine);
                }
                return [];
            }
            return null;
        });
        this.appDataLineList = new AppDataLineList(tempLineList, this.scope);
        this.appDataLineList.extractLabelDefinitions();
    }
    
    extractGlobalVariableDefinitions(): void {
        this.processLines((line) => {
            const tempDefinition = variableUtils.extractGlobalVariableDefinition(line);
            if (tempDefinition !== null) {
                this.globalVariableDefinitionMap.setIndexDefinition(tempDefinition);
                return [];
            }
            return null;
        });
        this.globalFrameSize = variableUtils.populateVariableDefinitionIndexes(
            this.globalVariableDefinitionMap,
        );
    }
    
    populateScopeDefinitions(): void {
        this.scope.indexDefinitionMapList = [
            this.globalVariableDefinitionMap,
            this.appDataLineList.labelDefinitionMap,
            this.functionDefinitionMap,
        ];
    }
    
    generateFileBuffer(): void {
        
        // If any root assembly lines are left over, it means they
        // were not recognized in any parsing step.
        if (this.rootLineList.length > 0) {
            const tempLine = this.rootLineList[0];
            throw new AssemblyError(
                "Unknown directive.",
                tempLine.lineNumber,
                tempLine.filePath,
            );
        }
        
        // Create a list of function definitions in the correct order.
        const functionDefinitionList = [];
        this.functionDefinitionMap.iterate((definition) => {
            functionDefinitionList[definition.index] = definition;
        });
        
        // Create the header buffer. App data file position will not
        // be known until later.
        this.headerBuffer = Buffer.alloc(fileHeaderSize);
        this.headerBuffer.writeUInt32LE(this.globalFrameSize, 0);
        this.headerBuffer.writeUInt32LE(functionDefinitionList.length, 4);
        
        // Create app data buffer. This must happen before assembling
        // instructions, because instructions may use app data labels.
        this.appDataBuffer = this.appDataLineList.createBuffer();
        
        // Create function table buffer and instructions buffer.
        const functionTableSize = functionDefinitionList.length * functionTableEntrySize;
        let instructionsFilePos = this.headerBuffer.length + functionTableSize;
        const functionTableBufferList = [];
        const instructionsBufferList = [];
        for (const definition of functionDefinitionList) {
            const tempInstructionsBuffer = definition.createInstructionsBuffer();
            const tempEntryBuffer = definition.createTableEntryBuffer(
                instructionsFilePos,
                tempInstructionsBuffer.length,
            );
            instructionsFilePos += tempInstructionsBuffer.length;
            functionTableBufferList.push(tempEntryBuffer);
            instructionsBufferList.push(tempInstructionsBuffer);
        }
        this.functionTableBuffer = Buffer.concat(functionTableBufferList);
        this.instructionsBuffer = Buffer.concat(instructionsBufferList);
        assert(functionTableSize === this.functionTableBuffer.length);
        
        // Populate app data file position.
        this.headerBuffer.writeUInt32LE(this.headerBuffer.length
            + this.functionTableBuffer.length + this.instructionsBuffer.length, 8);
        
        // Concatenate everything together.
        this.fileBuffer = Buffer.concat([
            this.headerBuffer,
            this.functionTableBuffer,
            this.instructionsBuffer,
            this.appDataBuffer,
        ]);
    }
    
    assembleCodeFile(sourcePath: string, destinationPath: string): void {
        
        console.log(`Assembling "${sourcePath}"...`);
        
        try {
            this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
            this.expandAliasInvocations();
            this.populateScopeInRootLines();
            this.extractDefinitions();
            this.populateScopeDefinitions();
            this.generateFileBuffer();
        } catch (error) {
            if (error instanceof AssemblyError) {
                if (error.lineNumber === null || error.filePath === null) {
                    console.log("Error: " + error.message);
                } else {
                    console.log(`Error in "${error.filePath}" on line ${error.lineNumber}: ${error.message}`);
                }
                return;
            } else {
                throw error;
            }
        }
        
        if (this.shouldBeVerbose) {
            console.log(this.getDisplayString());
        }
        
        fs.writeFileSync(destinationPath, this.fileBuffer);
        console.log("Finished assembling.");
        console.log(`Destination path: "${destinationPath}"`);
    }
}

