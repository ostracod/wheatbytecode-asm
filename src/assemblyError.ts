
import { Displayable } from "./types.js";
import { AssemblyLine } from "./lines/assemblyLine.js";

export class AssemblyError implements Displayable {
    message: string;
    lineNumber: number;
    filePath: string;
    
    constructor(message: string, lineNumber?: number, filePath?: string) {
        this.message = message;
        if (typeof lineNumber === "undefined") {
            this.lineNumber = null;
        } else {
            this.lineNumber = lineNumber;
        }
        if (typeof filePath === "undefined") {
            this.filePath = null;
        } else {
            this.filePath = filePath;
        }
    }
    
    populateLine(line: AssemblyLine): void {
        if (this.lineNumber === null) {
            this.lineNumber = line.lineNumber;
        }
        if (this.filePath === null) {
            this.filePath = line.filePath;
        }
    }
    
    getDisplayString(): string {
        const prepositionPhrases: string[] = [];
        if (this.filePath !== null) {
            prepositionPhrases.push(` in "${this.filePath}"`);
        }
        if (this.lineNumber !== null) {
            prepositionPhrases.push(" on line " + this.lineNumber);
        }
        return `Error${prepositionPhrases.join("")}: ${this.message}`;
    }
}

export class UnresolvedIndexError {
    
    constructor() {
        
    }
}
