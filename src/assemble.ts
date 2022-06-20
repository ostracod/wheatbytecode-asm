
import * as assemblyUtils from "./utils/assemblyUtils.js";
import { Assembler } from "./assembler.js";

const printPermittedFileExtension = (): void => {
    console.log(`Assembly files must end in the extension "${assemblyUtils.assemblyFileExtension}".`);
};

const printUsageAndExit = (): void => {
    console.log("Usage: node assemble.js [-v] (path to assembly file)");
    printPermittedFileExtension();
    process.exit(1);
};

const printExtensionErrorAndExit = (): void => {
    console.log("Invalid assembly file extension.");
    printPermittedFileExtension();
    process.exit(1);
};

if (process.argv.length !== 3 && process.argv.length !== 4) {
    printUsageAndExit();
}

const sourcePath = process.argv[process.argv.length - 1];
const destinationPath = assemblyUtils.stripAssemblyExtension(sourcePath);
if (destinationPath === null) {
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

const assembler = new Assembler({
    shouldBeVerbose,
    shouldPrintLog: true,
});
assembler.catchAssemblyError(() => {
    assembler.assembleCodeFile(sourcePath, destinationPath);
});


