import {
	BeticExpressionStatement,
	BeticProgramStatement,
	IBeticArgument,
	IBeticPosition,
	IBeticPrimitiveType,
} from './parse.ts';

export interface PrimitiveData {
	representation: BeticPrimitiveRepresentation;
	engine: string | null;
}

export interface TypeData {
	representation: BeticTypeRepresentation;
	engine: string | null;
}

export interface IBeticPrimitiveRepresentation {
	constant: boolean;
	expected: boolean;
	name: string | null
}

export interface BeticIntRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Int' };
	value: number;
}

export interface BeticByteRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Byte' };
	value: number;
}

export interface BeticDoubleRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Double' };
	value: number;
}

export interface BeticBooleanRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Boolean' };
	value: boolean;
}

export interface BeticStringRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'String' };
	value: string;
}

export interface BeticNoneRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'None' };
	value: 'none';
}

export interface BeticListRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'List'; of: IBeticPrimitiveType };
	value: PrimitiveData[];
}

export interface BeticMapRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Map'; of: IBeticPrimitiveType };
	value: { key: string; value: PrimitiveData }[];
}

export interface BeticCustomRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: string };
	value: { key: string; value: PrimitiveData }[];
}

export interface BeticFunctionRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Function'; of: IBeticPrimitiveType };
	value: BeticProgramStatement[];
	arguments: IBeticArgument[];
	provides: { body: BeticExpressionStatement; position: IBeticPosition } | null;
}

export interface BeticMicroRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Micro'; of: IBeticPrimitiveType };
	value: BeticProgramStatement[];
	prototype: {
		type: IBeticPrimitiveType;
		value: string;
		optional: boolean;
	};
	provides: { body: BeticExpressionStatement; position: IBeticPosition } | null;
}

export interface BeticNativeFunctionRepresentation extends IBeticPrimitiveRepresentation {
	type: { base: 'Function'; of: IBeticPrimitiveType };
	value: Function;
	arguments: IBeticArgument[];
	provides: { body: BeticExpressionStatement; position: IBeticPosition } | null;
}

export type BeticPrimitiveRepresentation =
	| BeticIntRepresentation
	| BeticByteRepresentation
	| BeticDoubleRepresentation
	| BeticBooleanRepresentation
	| BeticStringRepresentation
	| BeticNoneRepresentation
	| BeticListRepresentation
	| BeticMapRepresentation
	| BeticCustomRepresentation
	| BeticFunctionRepresentation
	| BeticMicroRepresentation
	| BeticNativeFunctionRepresentation;

export interface BeticTypeRepresentation {
	fields: {
		type: IBeticPrimitiveType;
		value: string;
		optional: boolean;
	}[];
}
