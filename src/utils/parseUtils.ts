
import * as fs from "fs";
import { ArgNumeric } from "../types.js";
import { unaryOperatorList, binaryOperatorList, Operator, UnaryOperator, BinaryOperator } from "../delegates/operator.js";
import { compressibleIntegerType, float64Type, signedIntegerTypeList } from "../delegates/dataType.js";
import { AssemblyError } from "../assemblyError.js";
import { Expression, MemberAccessExpression, SubscriptExpression, ArgWord, ArgNumber, ArgString } from "../expression.js";
import { NumberConstant } from "../constant.js";
import { AssemblyLine } from "../lines/assemblyLine.js";
import * as assemblyUtils from "./assemblyUtils.js";

const codeBlockDirectiveNameSet = ["FUNC", "APP_DATA", "MACRO"];

export const skipWhitespace = (text: string, index: number): number => {
    while (index < text.length) {
        const tempCharacter = text.charAt(index);
        if (tempCharacter !== " " && tempCharacter !== "\t") {
            break;
        }
        index += 1;
    }
    return index;
};

export const skipDirectiveCharacters = (text: string, index: number): number => {
    while (index < text.length) {
        const tempCharacter = text.charAt(index);
        if (tempCharacter === " " || tempCharacter === "\t" || tempCharacter === "#") {
            break;
        }
        index += 1;
    }
    return index;
};

export const isFirstArgWordCharacter = (character: string): boolean => {
    if (character === "_") {
        return true;
    }
    const tempCharCode = character.charCodeAt(0);
    // Uppercase letters or lowercase letters.
    return ((tempCharCode >= 65 && tempCharCode <= 90)
        || (tempCharCode >= 97 && tempCharCode <= 122));
};

export const isArgWordCharacter = (character: string): boolean => {
    if (isFirstArgWordCharacter(character)) {
        return true;
    }
    const tempCharCode = character.charCodeAt(0);
    // Digits.
    return (tempCharCode >= 48 && tempCharCode <= 57);
};

export const isFirstArgNumericCharacter = (character: string): boolean => {
    if (character === ".") {
        return true;
    }
    const tempCharCode = character.charCodeAt(0);
    // Hexadecimal digits.
    return ((tempCharCode >= 48 && tempCharCode <= 57)
        || (tempCharCode >= 65 && tempCharCode <= 70)
        || (tempCharCode >= 97 && tempCharCode <= 102));
};

export const isArgNumericCharacter = (character: string): boolean => {
    if (isFirstArgNumericCharacter(character)) {
        return true;
    }
    return (character === "x");
};

export const parseArgOperator = (
    text: string,
    index: number,
    operatorList: Operator[],
): { operator: Operator, index: number } => {
    for (const operator of operatorList) {
        const tempOperatorText = operator.text;
        const tempEndIndex = index + tempOperatorText.length;
        if (tempEndIndex > text.length) {
            continue;
        }
        const tempText = text.substring(index, tempEndIndex);
        if (tempText === tempOperatorText) {
            return { operator, index: tempEndIndex };
        }
    }
    return { operator: null, index };
};

export const parseArgWord = (text: string, index: number): { argWord: ArgWord, index: number }  => {
    const tempStartIndex = index;
    while (index < text.length) {
        const tempCharacter = text.charAt(index);
        if (!isArgWordCharacter(tempCharacter)) {
            break;
        }
        index += 1;
    }
    const tempEndIndex = index;
    const tempText = text.substring(tempStartIndex, tempEndIndex);
    return {
        argWord: new ArgWord(tempText),
        index,
    };
};

// text contains only hexadecimal digits.
export const parseHexadecimalArgNumber = (text: string): ArgNumber => {
    const tempByteAmount = Math.ceil(text.length / 2);
    for (const integerType of signedIntegerTypeList) {
        if (integerType.byteAmount >= tempByteAmount) {
            const tempConstant = new NumberConstant(parseInt(text, 16), integerType);
            return new ArgNumber(tempConstant);
        }
    }
    throw new AssemblyError("Hexadecimal literal has too many digits.");
};

export const parseArgNumeric = (
    text: string,
    index: number,
): { argNumeric: ArgNumeric, index: number } => {
    const tempStartIndex = index;
    while (index < text.length) {
        const tempCharacter = text.charAt(index);
        if (!isArgNumericCharacter(tempCharacter)) {
            break;
        }
        index += 1;
    }
    const tempEndIndex = index;
    const tempText = text.substring(tempStartIndex, tempEndIndex);
    const tempComponentList = tempText.split(".");
    let tempArgNumeric;
    if (tempComponentList.length === 1) {
        if (tempText.length > 2 && tempText.substring(0, 2) === "0x") {
            tempArgNumeric = parseHexadecimalArgNumber(
                tempText.substring(2, tempText.length),
            );
        } else {
            const tempConstant = new NumberConstant(
                parseInt(tempComponentList[0], 10),
                compressibleIntegerType,
            );
            tempArgNumeric = new ArgNumber(tempConstant);
        }
    } else if (tempComponentList.length === 2) {
        const tempConstant = new NumberConstant(parseFloat(tempText), float64Type);
        tempArgNumeric = new ArgNumber(tempConstant);
    } else {
        throw new AssemblyError("Malformed numeric argument.");
    }
    return { argNumeric: tempArgNumeric, index };
};

export const parseArgString = (
    text: string,
    index: number,
): { argString: ArgString, index: number } => {
    const tempCharacter = text.charAt(index);
    if (tempCharacter !== "\"") {
        throw new AssemblyError("Expected quotation mark.");
    }
    index += 1;
    let tempText = "";
    let tempIsEscaped = false;
    while (true) {
        if (index >= text.length) {
            throw new AssemblyError("Expected quotation mark.");
        }
        const tempCharacter = text.charAt(index);
        index += 1;
        if (tempIsEscaped) {
            if (tempCharacter === "n") {
                tempText += "\n";
            } else {
                tempText += tempCharacter;
            }
            tempIsEscaped = false;
        } else {
            if (tempCharacter === "\"") {
                break;
            } else if (tempCharacter === "\\") {
                tempIsEscaped = true;
            } else {
                tempText += tempCharacter;
            }
        }
    }
    return {
        argString: new ArgString(tempText),
        index,
    };
};

export const parseArgExpression = (
    text: string,
    index: number,
    precedence: number,
): { expression: Expression, index: number } => {
    index = skipWhitespace(text, index);
    if (index >= text.length) {
        throw new AssemblyError("Expected expression.");
    }
    let outputExpression;
    // Look for unary operator.
    const tempOperatorResult = parseArgOperator(text, index, unaryOperatorList);
    const tempUnaryOperator = tempOperatorResult.operator as UnaryOperator;
    if (tempUnaryOperator === null) {
        const tempCharacter = text.charAt(index);
        if (isFirstArgWordCharacter(tempCharacter)) {
            // Parse keyword or identifier.
            const tempResult1 = parseArgWord(text, index);
            index = tempResult1.index;
            outputExpression = tempResult1.argWord;
        } else if (isFirstArgNumericCharacter(tempCharacter)) {
            // Parse number literal.
            const tempResult2 = parseArgNumeric(text, index);
            index = tempResult2.index;
            outputExpression = tempResult2.argNumeric;
        } else if (tempCharacter === "\"") {
            // Parse string literal.
            const tempResult3 = parseArgString(text, index);
            index = tempResult3.index;
            outputExpression = tempResult3.argString;
        } else if (tempCharacter === "(") {
            // Parse expression in parentheses.
            index += 1;
            const tempResult4 = parseArgExpression(text, index, 99);
            outputExpression = tempResult4.expression;
            index = tempResult4.index;
            index = skipWhitespace(text, index);
            if (index >= text.length) {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            const tempCharacter = text.charAt(index);
            if (tempCharacter !== ")") {
                throw new AssemblyError("Expected closing parenthesis.");
            }
            index += 1;
        } else {
            throw new AssemblyError("Unexpected symbol.");
        }
    } else {
        index = tempOperatorResult.index;
        // Create a unary expression.
        const tempExpressionResult = parseArgExpression(text, index, 0);
        const tempExpression = tempExpressionResult.expression;
        outputExpression = tempUnaryOperator.createExpression(tempExpression);
        index = tempExpressionResult.index;
    }
    // Keep parsing binary and ternary expressions until
    // we meet input precedence or reach the end.
    while (true) {
        index = skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        const tempCharacter = text.charAt(index);
        if (tempCharacter === "[") {
            if (precedence <= 2) {
                break;
            }
            // Create a subscript expression.
            index += 1;
            let tempExpressionResult = parseArgExpression(text, index, 99);
            const tempIndexExpression = tempExpressionResult.expression;
            index = tempExpressionResult.index;
            index = skipWhitespace(text, index);
            if (index >= text.length - 1) {
                throw new AssemblyError("Expected subscript data type.");
            }
            const tempText = text.substring(index, index + 2);
            if (tempText !== "]:") {
                throw new AssemblyError("Expected subscript data type.");
            }
            index += 2;
            tempExpressionResult = parseArgExpression(text, index, 1);
            const tempDataTypeExpression = tempExpressionResult.expression;
            index = tempExpressionResult.index;
            outputExpression = new SubscriptExpression(
                outputExpression,
                tempIndexExpression,
                tempDataTypeExpression,
            );
            continue;
        }
        if (tempCharacter === ".") {
            // Create a member access expression.
            index += 1;
            index = skipWhitespace(text, index);
            if (index >= text.length) {
                throw new AssemblyError("Expected identifier.");
            }
            const firstCharacter = text.charAt(index);
            if (!isFirstArgWordCharacter(firstCharacter)) {
                throw new AssemblyError("Expected identifier.");
            }
            const result = parseArgWord(text, index);
            ({ index } = result);
            const memberName = result.argWord.text;
            outputExpression = new MemberAccessExpression(outputExpression, memberName);
            continue;
        }
        // Look for binary operator.
        const tempOperatorResult = parseArgOperator(text, index, binaryOperatorList);
        const tempBinaryOperator = tempOperatorResult.operator as BinaryOperator;
        if (tempBinaryOperator === null) {
            break;
        }
        if (tempBinaryOperator.precedence >= precedence) {
            break;
        }
        index = tempOperatorResult.index;
        // Create a binary expression.
        const tempExpressionResult = parseArgExpression(text, index, tempBinaryOperator.precedence);
        const tempExpression = tempExpressionResult.expression;
        outputExpression = tempBinaryOperator.createExpression(
            outputExpression,
            tempExpression,
        );
        index = tempExpressionResult.index;
    }
    return { expression: outputExpression, index };
};

export const parseLineText = (text: string): AssemblyLine => {
    
    let index = 0;
    
    // Parse the directive name.
    index = skipWhitespace(text, index);
    const tempStartIndex = index;
    index = skipDirectiveCharacters(text, index);
    const tempEndIndex = index;
    if (tempStartIndex === tempEndIndex) {
        return null;
    }
    const tempDirectiveName = text.substring(tempStartIndex, tempEndIndex);
    
    // Parse the argument list.
    const tempArgList = [];
    while (true) {
        index = skipWhitespace(text, index);
        // Handle empty argument list.
        if (tempArgList.length === 0) {
            if (index >= text.length) {
                break;
            }
            const tempCharacter = text.charAt(index);
            if (tempCharacter === "#") {
                break;
            }
        }
        // Extract the argument.
        const tempResult = parseArgExpression(text, index, 99);
        index = tempResult.index;
        tempArgList.push(tempResult.expression);
        index = skipWhitespace(text, index);
        if (index >= text.length) {
            break;
        }
        // Seek the next argument if it exists.
        const tempCharacter = text.charAt(index);
        if (tempCharacter === "#") {
            break;
        }
        if (tempCharacter !== ",") {
            throw new AssemblyError("Expected comma.");
        }
        index += 1;
    }
    return new AssemblyLine(tempDirectiveName, tempArgList);
};

export const loadAssemblyFileContent = (path: string): string[] => {
    assemblyUtils.verifyAssemblyExtension(path);
    if (!fs.existsSync(path)) {
        throw new AssemblyError(`Missing source file "${path}".`);
    }
    const tempContent = fs.readFileSync(path, "utf8");
    return tempContent.split("\n");
};

export const parseAssemblyLines = (lineTextList: string[]): AssemblyLine[] => {
    const output = [];
    for (let index = 0; index < lineTextList.length; index++) {
        const tempText = lineTextList[index];
        const tempLineNumber = index + 1;
        let tempLine;
        try {
            tempLine = parseLineText(tempText);
        } catch (error) {
            if (error instanceof AssemblyError) {
                error.lineNumber = tempLineNumber;
            }
            throw error;
        }
        if (tempLine === null) {
            continue;
        }
        tempLine.lineNumber = tempLineNumber;
        output.push(tempLine);
    }
    return output;
};

export const collapseCodeBlocks = (lineList: AssemblyLine[]): AssemblyLine[] => {
    const output = [];
    // List of assembly lines which begin code blocks.
    const branchList = [];
    for (const line of lineList) {
        const tempDirectiveName = line.directiveName;
        if (tempDirectiveName === "END") {
            if (line.argList.length !== 0) {
                throw new AssemblyError("Expected 0 arguments.", line.lineNumber);
            }
            if (branchList.length <= 0) {
                throw new AssemblyError("Unexpected END statement.", line.lineNumber);
            }
            branchList.pop();
        } else {
            if (branchList.length > 0) {
                const tempCurrentBranch = branchList[branchList.length - 1];
                tempCurrentBranch.codeBlock.push(line);
            } else {
                output.push(line);
            }
            if (codeBlockDirectiveNameSet.indexOf(tempDirectiveName) >= 0) {
                line.codeBlock = [];
                branchList.push(line);
            }
        }
    }
    if (branchList.length > 0) {
        throw new AssemblyError("Missing END statement.");
    }
    return output;
};


