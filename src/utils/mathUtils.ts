
import { MixedNumber } from "../models/items.js";

export class MathUtils {
    
    convertMixedNumberToBigInt(value: MixedNumber): bigint {
        if (typeof value === "bigint") {
            return value;
        }
        return BigInt(Math.floor(value));
    }
    
    convertNumberToHexadecimal(value: number, length: number): string {
        let output = value.toString(16).toUpperCase();
        while (output.length < length) {
            output = "0" + output;
        }
        return "0x" + output;
    }
    
    convertBufferToHexadecimal(buffer: Buffer): string {
        const tempTextList = [];
        let index = 0;
        while (index < buffer.length) {
            const tempValue = buffer[index];
            tempTextList.push(mathUtils.convertNumberToHexadecimal(tempValue, 2));
            index += 1;
        }
        return tempTextList.join(" ");
    }
}

export const mathUtils = new MathUtils();


