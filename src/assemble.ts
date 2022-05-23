
import * as pathUtils from "path";
import { Assembler } from "./assembler.js";

const assemblerClassMap = { ".wbasm": Assembler };

const printPermittedFileExtensions = (): void => {
    const extensionList = [];
    for (const extension in assemblerClassMap) {
        extensionList.push(extension);
    }
    console.log("Permitted assembly file extensions: " + extensionList.join(", "));
};

const printUsageAndExit = (): void => {
    console.log("Usage: node assemble.js [-v] (path to assembly file)");
    printPermittedFileExtensions();
    process.exit(1);
};

const printExtensionErrorAndExit = (): void => {
    console.log("Invalid assembly file extension.");
    printPermittedFileExtensions();
    process.exit(1);
};

if (process.argv.length !== 3 && process.argv.length !== 4) {
    printUsageAndExit();
}

const sourcePath = process.argv[process.argv.length - 1];
const fileName = pathUtils.basename(sourcePath);
const tempIndex = fileName.lastIndexOf(".");
if (tempIndex < 0) {
    printExtensionErrorAndExit();
}
const fileExtension = fileName.substring(tempIndex, fileName.length);
if (!(fileExtension in assemblerClassMap)) {
    printExtensionErrorAndExit();
}

let shouldBeVerbose = false;
if (process.argv.length === 4) {
    if (process.argv[2] === "-v") {
        shouldBeVerbose = true;
    } else {
        printUsageAndExit();
    }
}

const destinationPath = sourcePath.substring(0, sourcePath.length - fileExtension.length);
const assemblerClass = assemblerClassMap[fileExtension];
const assembler = new assemblerClass(shouldBeVerbose);
assembler.assembleCodeFile(sourcePath, destinationPath);


