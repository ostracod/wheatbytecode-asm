
import { AssemblyLine } from "./lines/assemblyLine.js";

export class AssemblyError {
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
}

export class UnresolvedIndexError {
    
    constructor() {
        
    }
}
