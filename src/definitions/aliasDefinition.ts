
import { Displayable } from "../types.js";
import { Identifier } from "../identifier.js";
import { Expression } from "../expression.js";

export class AliasDefinition implements Displayable {
    identifier: Identifier;
    expression: Expression;
    
    constructor(identifier: Identifier, expression: Expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
    
    getDisplayString(): string {
        return `${this.identifier.getDisplayString()} = ${this.expression.getDisplayString()}`;
    }
}


