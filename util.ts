import * as Colors from 'https://deno.land/std@0.82.0/fmt/colors.ts';
import { IBeticPrimitiveType, BeticProgram, IBeticPosition, IBeticArgument } from './type/parse.ts';
import {
	BeticFunctionRepresentation,
	BeticListRepresentation,
	BeticNativeFunctionRepresentation,
	PrimitiveData,
} from './type/representation.ts';

export default class BeticUtility {
	static ErrorTitle: { [key: string]: string } = {
		SyntaxError: BeticUtility.Brackets('Syntax Error'),
		TypeMismatch: BeticUtility.Brackets('Type Mismatch'),
		UninitializedValue: BeticUtility.Brackets('Uninitialized Value'),
		UnindexibleReference: BeticUtility.Brackets('Unindexible Reference'),
		ImmutableValue: BeticUtility.Brackets('Immutable Value'),
		InvalidValue: BeticUtility.Brackets('Invalid Value'),
		AlreadyExists: BeticUtility.Brackets('Already Exists'),
		DuplicateKeys: BeticUtility.Brackets('Duplicate Keys'),
		MissingArgument: BeticUtility.Brackets('Missing Argument'),
		MissingProperty: BeticUtility.Brackets('Missing Property'),
		CannotOpenFile: BeticUtility.Brackets('Cannot Open File'),
		RuntimeError: BeticUtility.Brackets('Runtime Error'),
	};

	static Brackets(title: string): string {
		return `${Colors.brightRed('[')}${Colors.red(title)}${Colors.brightRed(']')}`;
	}

	static DiffTypes(source: IBeticPrimitiveType, target: IBeticPrimitiveType): boolean {
		if (source.base === target.base) {
			if (source.of && target.of) {
				if (BeticUtility.DiffTypes(source.of, target.of)) {
					return true;
				} else {
					return false;
				}
			} else if (source.of && !target.of) {
				return false;
			} else if (!source.of && target.of) {
				return false;
			} else {
				return true;
			}
		} else {
			if (source.base === 'Occult' || target.base === 'Occult') {
				return true;
			}
			return false;
		}
	}

	static SerializeType(type: IBeticPrimitiveType): string {
		let result = '';

		if (type.of) {
			if (type.base === 'List') {
				result += Colors.white('[]');
				result += BeticUtility.SerializeType(type.of);
			} else {
				result += Colors.brightMagenta(type.base);
				result += `${Colors.white('<')}${BeticUtility.SerializeType(type.of)}${Colors.white(
					'>'
				)}`;
			}
		} else {
			result += Colors.brightMagenta(type.base);
		}
		return result;
	}

	static SerializeTypePlain(type: IBeticPrimitiveType): string {
		let result = '';

		if (type.of) {
			if (type.base === 'List') {
				result += [];
				result += BeticUtility.SerializeTypePlain(type.of);
			} else {
				result += type.base;
				result += `<${BeticUtility.SerializeTypePlain(type.of)}>`;
			}
		} else {
			result += type.base;
		}
		return result;
	}

	static SerializeValue(primitive: PrimitiveData): string {
		let value = primitive.representation.value;
		switch (primitive.representation.type.base) {
			case 'None':
				return Colors.brightGreen('none');
			case 'Int':
				return Colors.brightCyan(value.toString());
			case 'Double':
				var result = value.toString();
				if (Number.isInteger(value)) {
					result += '.0';
				}
				return Colors.brightCyan(result);
			case 'String':
				return Colors.brightRed(value.toString());
			case 'Boolean':
				return Colors.yellow(value.toString());
			case 'List':
				var result = '[ ';

				result += (value as PrimitiveData[])
					.map((v) => BeticUtility.SerializeValue(v))
					.join(', ');

				result += ' ]';
				return result;
			case 'Map':
				var result = '{\n';

				result += (value as { key: string; value: PrimitiveData }[])
					.map((v) => `  ${v.key}: ${BeticUtility.SerializeValue(v.value)}`)
					.join(',\n');

				result += '\n}';
				return result;
			case 'Function':
				var result = `function -> ${BeticUtility.SerializeType(
					/* @ts-ignore */
					primitive.representation.type.of
				)} (${(primitive.representation as BeticFunctionRepresentation).arguments
					.map(
						(arg) =>
							`${BeticUtility.SerializeType(arg.type)} ${arg.value}${
								arg.optional ? Colors.brightYellow('?') : ''
							}`
					)
					.join(', ')}) { ... }`;

				return result;
			case 'Micro':
				var result = `micro -> ${BeticUtility.SerializeType(
					/* @ts-ignore */
					primitive.representation.type.of
				)} { ... }`;

				return result;
			default:
				var result = BeticUtility.SerializeType(primitive.representation.type) + ' {\n';

				result += (value as { key: string; value: PrimitiveData }[])
					.map((v) => `  ${v.key}: ${BeticUtility.SerializeValue(v.value)}`)
					.join(',\n');

				result += '\n}';
				return result;
		}
	}

	static SerializeValuePlain(primitive: PrimitiveData): string {
		let value = primitive.representation.value;
		switch (primitive.representation.type.base) {
			case 'None':
				return 'none';
			case 'Int':
				return value.toString();
			case 'Double':
				var result = value.toString();
				if (Number.isInteger(value)) {
					result += '.0';
				}
				return result;
			case 'String':
				return value.toString();
			case 'Boolean':
				return value.toString();
			case 'List':
				var result = '[ ';

				result += (value as PrimitiveData[])
					.map((v) => BeticUtility.SerializeValuePlain(v))
					.join(', ');

				result += ' ]';
				return result;
			case 'Map':
				var result = '{\n';

				result += (value as { key: string; value: PrimitiveData }[])
					.map((v) => `  ${v.key}: ${BeticUtility.SerializeValuePlain(v.value)}`)
					.join(',\n');

				result += '\n}';
				return result;
			case 'Function':
				var result = `function -> ${BeticUtility.SerializeTypePlain(
					/* @ts-ignore */
					primitive.representation.type.of
				)} (${(primitive.representation as BeticFunctionRepresentation).arguments
					.map(
						(arg) =>
							`${BeticUtility.SerializeTypePlain(arg.type)} ${arg.value}${
								arg.optional ? '?' : ''
							}`
					)
					.join(', ')}) { ... }`;

				return result;
			case 'Micro':
				var result = `micro -> ${BeticUtility.SerializeTypePlain(
					/* @ts-ignore */
					primitive.representation.type.of
				)} { ... }`;

				return result;
			default:
				var result =
					BeticUtility.SerializeTypePlain(primitive.representation.type) + ' {\n';

				result += (value as { key: string; value: PrimitiveData }[])
					.map((v) => `  ${v.key}: ${BeticUtility.SerializeValuePlain(v.value)}`)
					.join(',\n');

				result += '\n}';
				return result;
		}
	}

	static FromBeticListToUint8Array(list: PrimitiveData): Uint8Array {
		let result: Uint8Array;
		if (
			((list.representation.type as IBeticPrimitiveType).of as IBeticPrimitiveType).base ===
			'Byte'
		) {
			result = Uint8Array.from(
				(list.representation.value as PrimitiveData[]).map(
					(v) => v.representation.value
				) as number[]
			);
		} else {
			throw Error(
				`Cannot convert ${BeticUtility.SerializeType(
					list.representation.type
				)} to ${BeticUtility.SerializeType({ base: 'Uint8Array' })}`
			);
		}
		return result;
	}

	static async FromUint8ArrayToBeticList(
		list: Uint8Array,
		type?: IBeticPrimitiveType
	): Promise<BeticListRepresentation> {
		let result = (await BeticUtility.GeneratePrimitive(Array.from(list), type))
			.representation as BeticListRepresentation;
		return result;
	}

	static async GeneratePrimitive(value: any, type?: IBeticPrimitiveType): Promise<PrimitiveData> {
		if (value !== null) {
			switch (value.constructor.name) {
				case 'Number':
					return {
						representation: {
							type: type || { base: Number.isInteger(value) ? 'Int' : 'Double' },
							value,
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
				case 'String':
					return {
						representation: {
							type: type || { base: 'String' },
							value,
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
				case 'Boolean':
					return {
						representation: {
							type: type || { base: 'Boolean' },
							value,
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
    // deno-lint-ignore no-case-declarations
				case 'Array':
					const listValues: PrimitiveData[] = [];

					for await (const v of value) {
						listValues.push(await BeticUtility.GeneratePrimitive(v));
					}

					return {
						representation: {
							type: { base: 'List', of: type?.of || { base: 'Occult' } },
							value: listValues,
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
    // deno-lint-ignore no-case-declarations
				case 'Object':
					const mapValues: { key: string; value: PrimitiveData }[] = [];
					for await (const [i, v] of Object.keys(value).entries()) {
						mapValues.push({
							key: v,
							value: await BeticUtility.GeneratePrimitive(Object.values(value)[i]),
						});
					}

					return {
						representation: {
							type: type || { base: 'Map', of: { base: 'Occult' } },
							value: mapValues,
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
				case 'Function':
					var { func, args, type: $type } = value();
					return {
						representation: {
							type: type || { base: 'Function', of: $type || { base: 'Occult' } },
							value: func,
							arguments: args || [],
							provides: null,
							expected: false,
							constant: false,
							name: null,
						} as BeticNativeFunctionRepresentation,
						engine: null,
					};
				case 'AsyncFunction':
					var { func, args, type: $type } = await value();
					return {
						representation: {
							type: type || { base: 'Function', of: $type || { base: 'Occult' } },
							value: func,
							arguments: args || [],
							provides: null,
							expected: false,
							constant: false,
							name: null,
						} as BeticNativeFunctionRepresentation,
						engine: null,
					};
				default:
					return {
						representation: {
							type: { base: 'None' },
							value: 'none',
							expected: false,
							constant: false,
							name: null,
						},
						engine: null,
					};
			}
		} else {
			return {
				representation: {
					type: { base: 'None' },
					value: 'none',
					expected: false,
					constant: false,
					name: null,
				},
				engine: null,
			};
		}
	}

	static async Parse(input: string): Promise<BeticProgram> {
		const p = Deno.run({
			cmd: ['parser', input],
			stdout: 'piped',
			stderr: 'piped',
		});

		const { code } = await p.status();

		if (code === 0) {
			const json = JSON.parse(new TextDecoder('utf-8').decode(await p.output()));
			return json;
		} else {
			throw new Error(new TextDecoder().decode(await p.stderrOutput()));
		}
	}

	static Error(
		engine: any,
		title: string,
		message: string,
		position: IBeticPosition | 'Anonymous'
	) {
		if (position === 'Anonymous') {
			console.log(`${title} in ${engine.path}`, '\n');
			console.log(message, `\nError occured at anonymous engine`);
		} else {
			if (position.line < 1 || position.col < 1) {
				console.log(`${title} in ${engine.path}`, '\n');
				console.log(
					message,
					`\nError occured at anonymous position thrown from ${Colors.brightBlue(
						engine.fileName
					)}`,
					'\n'
				);
			} else {
				console.log(`${title} in ${engine.path}`, '\n');
				console.log(
					message,
					`\nError occured at ${Colors.brightBlue(engine.fileName)} ${Colors.brightBlue(
						position.line.toString()
					)}:${Colors.brightBlue(position.col.toString())}`,
					'\n'
				);

				let tabs = 0;
				let line = engine.content.split('\n')[position.line - 1];

				for (let i = 0; i < line.length; i++) {
					if (line[i] === '\r' || line[i] === '\t') {
						tabs++;
					}
				}

				console.log(Colors.gray(engine.content.split('\n')[position.line - 1]));
				console.log(
					new Array(tabs).join('\t') + new Array(position.col - tabs).join(' ') + '^'
				);
			}
		}
		BeticUtility.OnError();
	}

	static OnError() {}
}
