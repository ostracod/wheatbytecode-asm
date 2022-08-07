
import { dataType as specDataType } from "wheatsystem-spec";
import { NumberTypeClass } from "../types.js";
import { numberTypeList, numberTypeMap, DataType, NumberType, IntegerType, UnsignedIntegerType, SignedIntegerType } from "../delegates/dataType.js";
import { AssemblyError } from "../assemblyError.js";

export const getDataTypeByName = (name: string): DataType => {
    if (!(name in numberTypeMap)) {
        throw new AssemblyError("Unrecognized data type.");
    }
    return numberTypeMap[name];
};

export const getNumberType = (
    numberTypeClass: NumberTypeClass,
    byteAmount: number,
): NumberType => {
    for (const numberType of numberTypeList) {
        if (numberType.constructor === numberTypeClass
                && numberType.byteAmount === byteAmount) {
            return numberType;
        }
    }
    return null;
};

export const mergeNumberTypes = (
    numberType1: NumberType,
    numberType2: NumberType,
): NumberType => {
    
    let tempClass;
    let tempByteAmount;
    
    let tempPriority1 = numberType1.getClassMergePriority();
    let tempPriority2 = numberType2.getClassMergePriority();
    if (tempPriority1 >= tempPriority2) {
        tempClass = numberType1.constructor;
    } else {
        tempClass = numberType2.constructor;
    }
    
    tempPriority1 = numberType1.getByteAmountMergePriority();
    tempPriority2 = numberType2.getByteAmountMergePriority();
    if (tempPriority1 > tempPriority2) {
        tempByteAmount = numberType1.byteAmount;
    } else if (tempPriority1 < tempPriority2) {
        tempByteAmount = numberType2.byteAmount;
    } else {
        tempByteAmount = Math.max(numberType1.byteAmount, numberType2.byteAmount);
    }
    
    return getNumberType(tempClass, tempByteAmount);
};

export const convertSpecIntegerType = (dataType: specDataType.IntegerType): IntegerType => (
    getNumberType(
        dataType.isSigned ? SignedIntegerType : UnsignedIntegerType,
        dataType.bitAmount / 8,
    ) as IntegerType
);

export const convertSpecDataType = (dataType: specDataType.DataType): {
    dataType: DataType,
    arrayLength: number,
} => {
    if (dataType instanceof specDataType.IntegerType) {
        const integerType = convertSpecIntegerType(dataType);
        return { dataType: integerType, arrayLength: 1 };
    }
    if (dataType instanceof specDataType.ArrayType) {
        const { elementType } = dataType;
        if (!(elementType instanceof specDataType.IntegerType)) {
            throw new AssemblyError("Unsupported specification array type.");
        }
        const integerType = convertSpecIntegerType(elementType);
        return { dataType: integerType, arrayLength: dataType.length };
    }
    throw new AssemblyError("Unsupported specification data type.");
};


