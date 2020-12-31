export interface BeticProgram {
	imports: BeticImportStatement[];
	program: BeticProgramStatement[];
	template: BeticTemplateStatement[];
}

export type BeticTemplateStatement =
	| BeticTemplateTagStatement
	| BeticTemplateIfStatement
	| BeticTemplateForStatement
	| BeticTemplateSwitchStatement
	| BeticCommentStatement;

export interface BeticTemplateTagStatement {
	operation: 'tag';
	name: string;
	attributes: {
		key: string;
		value: BeticExpressionStatement;
		position: IBeticPosition;
	}[];
	body: BeticTemplateStatement[];
	position: IBeticPosition;
}
export interface BeticTemplateIfStatement {
	operation: 'if_statement';
	condition: BeticExpressionStatement;
	body: IBeticTemplateCodeBlock;
	elifs: {
		condition: BeticExpressionStatement;
		body: IBeticTemplateCodeBlock;
	}[];
	else: IBeticTemplateCodeBlock;
	position: IBeticPosition;
}
export interface BeticTemplateForStatement {
	operation: 'for_statement';
	statement: BeticExpressionStatement;
	placeholder: string;
	body: IBeticTemplateCodeBlock;
	position: IBeticPosition;
}
export interface BeticTemplateSwitchStatement {
	operation: 'switch_statement';
	condition: BeticExpressionStatement;
	cases: {
		case: BeticExpressionStatement;
		body: IBeticTemplateCodeBlock;
	}[];
	position: IBeticPosition;
}

export interface BeticImportStatement {
	source: {
		value: string;
		position: IBeticPosition;
	};
	as: string;
	position: IBeticPosition;
}

export type BeticProgramStatement =
	| BeticVariableDefinitionStatement
	| BeticTypeDefinitionStatement
	| BeticFunctionDefinitionStatement
	| BeticMicroDefinitionStatement
	| BeticMacroDefinitionStatement
	| BeticForStatement
	| BeticIfStatement
	| BeticSwitchStatement
	| BeticAssignStatement
	| BeticQuantityModifierStatement
	| BeticTryCatchStatement
	| BeticCommentStatement
	| BeticExpressionStatement;

export interface BeticVariableDefinitionStatement {
	operation: 'variable_definition';
	constant: boolean;
	expected: boolean;
	name: string;
	value: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticTypeDefinitionStatement {
	operation: 'type_definition';
	name: string;
	body: IBeticArgument[];
	position: IBeticPosition;
}
export interface BeticFunctionDefinitionStatement {
	operation: 'function_definition';
	name: string;
	type: IBeticPrimitiveType;
	arguments: IBeticArgument[];
	body: IBeticCodeBlock;
	position: IBeticPosition;
}
export interface BeticMicroDefinitionStatement {
	operation: 'micro_definition';
	name: string;
	type: IBeticPrimitiveType;
	prototype: IBeticArgument;
	body: IBeticCodeBlock;
	position: IBeticPosition;
}
export interface BeticMacroDefinitionStatement {
	operation: 'macro_definition';
	name: string;
	type: IBeticPrimitiveType;
	prototype: IBeticArgument;
	arguments: IBeticArgument[];
	body: IBeticCodeBlock;
	position: IBeticPosition;
}
export interface BeticForStatement {
	operation: 'for_statement';
	statement: BeticExpressionStatement;
	placeholder: string;
	body: IBeticCodeBlock;
	position: IBeticPosition;
}
export interface BeticIfStatement {
	operation: 'if_statement';
	condition: BeticExpressionStatement;
	body: IBeticCodeBlock;
	elifs: {
		condition: BeticExpressionStatement;
		body: IBeticCodeBlock;
	}[];
	else: IBeticCodeBlock;
	position: IBeticPosition;
}
export interface BeticSwitchStatement {
	operation: 'switch_statement';
	condition: BeticExpressionStatement;
	cases: {
		case: BeticExpressionStatement;
		body: IBeticCodeBlock;
	}[];
	position: IBeticPosition;
}
export interface BeticAssignStatement {
	operation: 'assign_statement';
	left: BeticExpressionStatement;
	right: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticQuantityModifierStatement {
	operation: 'quantity_modifier';
	type: TBeticQuantityModifierType;
	statement: BeticExpressionStatement;
	right?: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticTryCatchStatement {
	operation: 'try_catch_block';
	tries: BeticProgramStatement[];
	catches: BeticProgramStatement[];
	arguments: IBeticArgument[];
}
export interface BeticCommentStatement {
	operation: 'comment';
	value: string;
	position: IBeticPosition;
}

export type BeticExpressionStatement =
	| BeticArithmeticExpression
	| BeticMapValueGetterExpression
	| BeticListValueGetterExpression
	| BeticFunctionCallExpression
	| BeticMicroCallExpression
	| BeticMacroCallExpression
	| BeticConditionExpression
	| BeticPrimitiveExpression
	| BeticReferenceExpression
	| BeticManuelCastExpression;

export interface BeticArithmeticExpression {
	operation: 'arithmetic';
	type: TBeticArithmeticType;
	left: BeticExpressionStatement;
	right: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticMapValueGetterExpression {
	operation: 'map_value_getter';
	left: BeticExpressionStatement;
	right: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticListValueGetterExpression {
	operation: 'list_value_getter';
	source: BeticExpressionStatement;
	index: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticFunctionCallExpression {
	operation: 'function_call';
	name: BeticExpressionStatement;
	arguments: BeticExpressionStatement[];
	position: IBeticPosition;
}
export interface BeticMicroCallExpression {
	operation: 'micro_call';
	name: BeticExpressionStatement;
	arguments: BeticExpressionStatement[];
	position: IBeticPosition;
}
export interface BeticMacroCallExpression {
	operation: 'macro_call';
	name: BeticExpressionStatement;
	arguments: BeticExpressionStatement[];
	position: IBeticPosition;
}
export interface BeticConditionExpression {
	operation: 'condition';
	type: TBeticConditionType;
	left: BeticExpressionStatement;
	right: BeticExpressionStatement;
	position: IBeticPosition;
}
export interface BeticPrimitiveExpression {
	operation: 'primitive';
	type: IBeticPrimitiveType;
	value?:
		| string
		| BeticExpressionStatement[]
		| { key: string; value: BeticExpressionStatement; position: IBeticPosition }[];
	body?: {
		block: BeticProgramStatement[];
		provides: { body: BeticExpressionStatement; position: IBeticPosition } | null;
	};
	prototype?: {
		type: IBeticPrimitiveType;
		value: string;
		optional: boolean;
	};
	arguments?: IBeticArgument[];
	position: IBeticPosition;
}
export interface BeticReferenceExpression {
	operation: 'reference';
	value: string;
	position: IBeticPosition;
}

export interface BeticManuelCastExpression {
	operation: 'manuel_cast';
	expression: BeticExpressionStatement;
	type: IBeticPrimitiveType;
	position: IBeticPosition;
}

export interface IBeticPosition {
	col: number;
	line: number;
}

export interface IBeticCodeBlock {
	block: BeticProgramStatement[];
	provides: { body: BeticExpressionStatement; position: IBeticPosition } | null;
}

export interface IBeticTemplateCodeBlock {
	block: BeticTemplateStatement[];
}

export type TBeticQuantityModifierType =
	| 'increment'
	| 'decrement'
	| 'add'
	| 'subtract'
	| 'multiply'
	| 'divide';

export type TBeticArithmeticType =
	| 'addition'
	| 'subtraction'
	| 'multiplication'
	| 'division'
	| 'exponent'
	| 'root'
	| 'modulus';

export type TBeticConditionType =
	| 'and'
	| 'or'
	| 'less_than'
	| 'greater_than'
	| 'less_than_equals'
	| 'greater_than_equals'
	| 'equals'
	| 'nand'
	| 'nor'
	| 'not_less_than'
	| 'not_greater_than'
	| 'not_less_than_equals'
	| 'not_greater_than_equals'
	| 'not_equals';

export interface IBeticPrimitiveType {
	base: TBeticPrimitiveType;
	of?: IBeticPrimitiveType;
}

export interface IBeticArgument {
	type: IBeticPrimitiveType;
	value: string;
	optional: boolean;
}

export type TBeticPrimitiveType =
	| 'Int'
	| 'Double'
	| 'String'
	| 'Boolean'
	| 'Occult'
	| 'Void'
	| 'Map'
	| 'List'
	| 'Function'
	| 'Micro'
	| 'Macro'
	| string;
