
import { ExpressionProcessor } from "../types.js";
import { Expression } from "../expression.js";

export const copyExpressions = (expressionList: Expression[]): Expression[] => (
    expressionList.map((expression) => expression.copy())
);

// processExpression accepts an expression, and returns
// an expression or null. If the output is an expression,
// the output expression replaces the input expression.
// If the output is null, then subexpressions are
// processed recursively. If output is not null and
// shouldRecurAfterProcess is true, then subexpressions
// are also processed recursively.
export const processExpressions = (
    expressionList: Expression[],
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean,
): void => {
    if (typeof shouldRecurAfterProcess === "undefined") {
        shouldRecurAfterProcess = false;
    }
    for (let index = 0; index < expressionList.length; index++) {
        let tempExpression = expressionList[index];
        tempExpression = tempExpression.processExpressions(
            processExpression,
            shouldRecurAfterProcess,
        );
        expressionList[index] = tempExpression;
    }
};


