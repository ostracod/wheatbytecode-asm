
import {NumberTypeClass} from "models/items";
import {DataTypeUtils as DataTypeUtilsInterface} from "models/utils";
import {DataType, NumberType} from "models/delegates";
import {numberTypeList, numberTypeMap} from "delegates/dataType";
import {AssemblyError} from "objects/assemblyError";

export interface DataTypeUtils extends DataTypeUtilsInterface {}

export class DataTypeUtils {
    
    getDataTypeByName(name: string): DataType {
        if (!(name in numberTypeMap)) {
            throw new AssemblyError("Unrecognized data type.");
        }
        return numberTypeMap[name];
    }
    
    getNumberType(numberTypeClass: NumberTypeClass, byteAmount: number): NumberType {
        for (let numberType of numberTypeList) {
            if (numberType.constructor === numberTypeClass
                    && numberType.byteAmount === byteAmount) {
                return numberType;
            }
        }
        return null;
    }
    
    mergeNumberTypes(numberType1: NumberType, numberType2: NumberType): NumberType {
        
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
        
        return dataTypeUtils.getNumberType(tempClass, tempByteAmount);
    }
}

export const dataTypeUtils = new DataTypeUtils();


