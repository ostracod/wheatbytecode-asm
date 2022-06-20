
import { Displayable } from "../types.js";
import { IdentifierMap } from "../identifier.js";
import * as mathUtils from "./mathUtils.js";

export const getIndentation = (indentationLevel: number): string => {
    let output = "";
    for (let count = 0; count < indentationLevel; count++) {
        output = output + "    ";
    }
    return output;
};

export const getTextListDisplayString = (
    title: string,
    textList: string[],
    indentationLevel?: number,
): string => {
    if (typeof indentationLevel === "undefined") {
        indentationLevel = 0;
    }
    if (textList.length <= 0) {
        return "";
    }
    const tempIndentation1 = getIndentation(indentationLevel);
    const tempIndentation2 = getIndentation(indentationLevel + 1);
    const tempTextList = [tempIndentation1 + title + ":"];
    for (const text of textList) {
        tempTextList.push(tempIndentation2 + text);
    }
    return tempTextList.join("\n");
};

export const getDisplayableListDisplayString = (
    title: string,
    displayableList: Displayable[],
    indentationLevel?: number,
): string => (
    getTextListDisplayString(
        title,
        displayableList.map((displayable) => displayable.getDisplayString()),
        indentationLevel,
    )
);

export const getIdentifierMapDisplayString = (
    title: string,
    identifierMap: IdentifierMap<Displayable>,
    indentationLevel?: number,
): string => (
    getDisplayableListDisplayString(
        title,
        identifierMap.getValueList(),
        indentationLevel,
    )
);

export const getBufferDisplayString = (title: string, buffer: Buffer): string => {
    const tempTextList = [title + ":"];
    const tempIndentation = getIndentation(1);
    let startIndex = 0;
    while (startIndex < buffer.length) {
        let endIndex = startIndex + 12;
        if (endIndex >= buffer.length) {
            endIndex = buffer.length;
        }
        const tempBuffer = buffer.slice(startIndex, endIndex);
        const tempText = mathUtils.convertBufferToHexadecimal(tempBuffer);
        tempTextList.push(tempIndentation + tempText);
        startIndex = endIndex;
    }
    return tempTextList.join("\n") + "\n";
};

// Excludes empty strings.
export const joinTextList = (textList: string[]): string => {
    const tempTextList = [];
    for (const text of textList) {
        if (text.length > 0) {
            tempTextList.push(text);
        }
    }
    return tempTextList.join("\n");
};

export const getReverseMap = (map: { [key: string]: any }): { [key: string]: any } => {
    const output = {};
    for (const key in map) {
        const tempValue = map[key];
        output[tempValue] = key;
    }
    return output;
};

export const pluralize = (word: string, amount: number): string => (
    (amount === 1) ? word : word + "s"
);

export const getDictionaryWithDefaults = <T extends {}>(
    dictionary: T,
    defaultValues: T,
): T => {
    const output = {} as T;
    for (const key in dictionary) {
        output[key] = dictionary[key];
    }
    for (const key in defaultValues) {
        const defaultValue = defaultValues[key];
        if (typeof output[key] === "undefined" && typeof defaultValue !== "undefined") {
            output[key] = defaultValue;
        }
    }
    return output;
}


