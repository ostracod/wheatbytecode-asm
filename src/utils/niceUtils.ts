
import { NiceUtils as NiceUtilsInterface } from "../models/utils.js";
import { Displayable, IdentifierMap } from "../models/objects.js";
import { mathUtils } from "./mathUtils.js";

export interface NiceUtils extends NiceUtilsInterface {}

export class NiceUtils {
    
    getIndentation(indentationLevel: number): string {
        let output = "";
        for (let count = 0; count < indentationLevel; count++) {
            output = output + "    ";
        }
        return output;
    }
    
    getTextListDisplayString(
        title: string,
        textList: string[],
        indentationLevel?: number
    ): string {
        if (typeof indentationLevel === "undefined") {
            indentationLevel = 0;
        }
        if (textList.length <= 0) {
            return "";
        }
        const tempIndentation1 = niceUtils.getIndentation(indentationLevel);
        const tempIndentation2 = niceUtils.getIndentation(indentationLevel + 1);
        const tempTextList = [tempIndentation1 + title + ":"];
        for (const text of textList) {
            tempTextList.push(tempIndentation2 + text);
        }
        return tempTextList.join("\n");
    }
    
    getDisplayableListDisplayString(
        title: string,
        displayableList: Displayable[],
        indentationLevel?: number
    ): string {
        return niceUtils.getTextListDisplayString(
            title,
            displayableList.map((displayable) => displayable.getDisplayString()),
            indentationLevel
        );
    }
    
    getIdentifierMapDisplayString(
        title: string,
        identifierMap: IdentifierMap<Displayable>,
        indentationLevel?: number
    ): string {
        return niceUtils.getDisplayableListDisplayString(
            title,
            identifierMap.getValueList(),
            indentationLevel
        );
    }
    
    getBufferDisplayString(title: string, buffer: Buffer): string {
        const tempTextList = [title + ":"];
        const tempIndentation = niceUtils.getIndentation(1);
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
    }
    
    // Excludes empty strings.
    joinTextList(textList: string[]): string {
        const tempTextList = [];
        for (const text of textList) {
            if (text.length > 0) {
                tempTextList.push(text);
            }
        }
        return tempTextList.join("\n");
    }
    
    getReverseMap(map: { [key: string]: any }): { [key: string]: any } {
        const output = {};
        for (const key in map) {
            const tempValue = map[key];
            output[tempValue] = key;
        }
        return output;
    }
    
    pluralize(word: string, amount: number): string {
        if (amount === 1) {
            return word;
        } else {
            return word + "s";
        }
    }
}

export const niceUtils = new NiceUtils();


