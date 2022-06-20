
import * as pathUtils from "path";

export const assemblyFileExtension = ".wbasm";

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


