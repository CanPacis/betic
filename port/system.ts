import BeticUtility from '../util.ts';
import { BeticListRepresentation, PrimitiveData } from '../type/representation.ts';

import { readLines } from 'https://deno.land/std@0.76.0/io/bufio.ts';

export default class System {
	static make = BeticUtility.GeneratePrimitive({
		int: () => {
			return {
				func(_engine: any, primitive: PrimitiveData) {
					let value = parseInt(primitive.representation.value as string);

					if (!isNaN(value)) {
						return BeticUtility.GeneratePrimitive(value);
					} else {
						throw Error('Type cast failed');
					}
				},
			};
		},
		double: () => {
			return {
				func(_engine: any, primitive: PrimitiveData) {
					let value = parseFloat(primitive.representation.value as string);

					if (!isNaN(value)) {
						return BeticUtility.GeneratePrimitive(value, { base: 'Double' });
					} else {
						throw Error('Type cast failed');
					}
				},
			};
		},
		string: () => {
			return {
				func(_engine: any, primitive: PrimitiveData) {
					let value: string;
					if (primitive.representation.type.base === 'List') {
						let uint8array = BeticUtility.FromBeticListToUint8Array(primitive);
						value = new TextDecoder().decode(uint8array);
					} else {
						value = primitive.representation.value.toString();
					}

					return BeticUtility.GeneratePrimitive(value);
				},
			};
		},
		byte_array: async () => {
			return {
				async func(_engine: any, primitive: PrimitiveData) {
					let result = await BeticUtility.FromUint8ArrayToBeticList(
						new TextEncoder().encode(primitive.representation.value as string),
						{ base: 'List', of: { base: 'Int' } }
					);

					return result;
				},
				arg: [{ type: { base: 'String' }, value: 'data', optional: false }],
				type: { base: 'List', of: { base: 'Int' } },
			};
		},
	});
	static console = BeticUtility.GeneratePrimitive({
		write: () => {
			return {
				func(_engine: any, ...messages: PrimitiveData[]) {
					console.log(
						messages.map((message) => BeticUtility.SerializeValue(message)).join(' ')
					);
				},
				args: [{ type: { base: 'Occult' }, value: 'data', optional: true }],
				type: { base: 'Void' },
			};
		},
		read: async () => {
			return {
				async func(_engine: any, ...messages: PrimitiveData[]) {
					console.log(
						messages.map((message) => BeticUtility.SerializeValue(message)).join(' ')
					);

					for await (const line of readLines(Deno.stdin)) {
						return BeticUtility.GeneratePrimitive(line.trim());
					}
				},
				args: [{ type: { base: 'Occult' }, value: 'data', optional: true }],
				type: { base: 'String' },
			};
		},
	});
	static json = BeticUtility.GeneratePrimitive({
		compile: () => {
			return {
				func(_engine: any, data: PrimitiveData) {
					console.log('compiling json');
				},
			};
		},
		parse: async () => {
			return {
				async func(_engine: any, data: PrimitiveData) {
					return BeticUtility.GeneratePrimitive(
						JSON.parse(data.representation.value as string)
					);
				},
			};
		},
		parse_bytes: async () => {
			return {
				async func(_engine: any, data: PrimitiveData) {
					let uint8array = BeticUtility.FromBeticListToUint8Array(data);
					let value = new TextDecoder().decode(uint8array);
					return BeticUtility.GeneratePrimitive(JSON.parse(value));
				},
			};
		},
	});
	static typeof = BeticUtility.GeneratePrimitive(() => {
		return {
			func(_engine: any, message: PrimitiveData) {
				return BeticUtility.GeneratePrimitive(
					BeticUtility.SerializeType(message.representation.type)
				);
			},
		};
	});
	static len = BeticUtility.GeneratePrimitive(
		() => {
			return {
				func(_engine: any, message: PrimitiveData) {
					return BeticUtility.GeneratePrimitive(
						(message.representation.value as []).length
					);
				},
				args: [
					{
						type: { base: 'List', of: { base: 'Occult' } },
						value: 'list',
						optional: false,
					},
				],
			};
		},
		{ base: 'Function', of: { base: 'Int' } }
	);
	static split_str = BeticUtility.GeneratePrimitive(
		() => {
			return {
				func(_engine: any, string: PrimitiveData) {
					return BeticUtility.GeneratePrimitive(
						(string.representation.value as string).split(''),
						{
							base: 'List',
							of: { base: 'String' },
						}
					);
				},
				args: [{ type: { base: 'String' }, value: 'string', optional: false }],
			};
		},
		{ base: 'Function', of: { base: 'List', of: { base: 'String' } } }
	);
}
