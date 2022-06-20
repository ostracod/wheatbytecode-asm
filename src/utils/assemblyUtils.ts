
import * as pathUtils from "path";
import { AssemblyError } from "../assemblyError.js";

export const assemblyFileExtension = ".wbasm";

export const verifyAssemblyExtension = (filePath: string): void => {
    if (!filePath.endsWith(assemblyFileExtension)) {
        throw new AssemblyError(`Assembly file paths must end in the extension "${assemblyFileExtension}."`);
    }
};

export const stripAssemblyExtension = (filePath: string): string => {
    const fileName = pathUtils.basename(filePath);
    const index = fileName.lastIndexOf(".");
    if (index < 0) {
        return null;
    }
    const fileExtension = fileName.substring(index, fileName.length);
    if (fileExtension !== assemblyFileExtension) {
        return null;
    }
    return filePath.substring(0, filePath.length - fileExtension.length);
};


