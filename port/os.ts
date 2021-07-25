import { BeticListRepresentation, PrimitiveData } from '../type/representation.ts';

import * as path from 'https://deno.land/std@0.82.0/path/mod.ts';
import BeticUtility from '../util.ts';

export default class Os {
	static EngineOsPort = BeticUtility.GeneratePrimitive({
  // deno-lint-ignore require-await
		read_file: async () => {
			return {
				async func(parameter: PrimitiveData) {
					let readPath = parameter.representation.value as string;
					let result: Number[];

					if (path.isAbsolute(readPath)) {
						result = Array.from(await Deno.readFile(readPath));
						return BeticUtility.GeneratePrimitive(result, {
							base: 'List',
							of: { base: 'Byte' },
						});
					} else {
						throw Error('Path must be an absolute path');
					}
				},
				args: [{ type: { base: 'String' }, value: 'path', optional: false }],
			};
		},
  // deno-lint-ignore require-await
		write_file: async () => {
			return {
				async func(_engine: any, parameter: PrimitiveData, data: PrimitiveData) {
					let readPath = parameter.representation.value as string;
					if (data.representation.type.base === 'String') {
						await Deno.writeFile(
							readPath,
							new TextEncoder().encode(data.representation.value as string)
						);
					} else {
						await Deno.writeFile(
							readPath,
							BeticUtility.FromBeticListToUint8Array(data)
						);
					}
				},
				args: [
					{ type: { base: 'String' }, value: 'path', optional: false },
					{ type: { base: 'Occult' }, value: 'data', optional: false },
				],
			};
		},
		cwd: () => {
			return {
				func(engine: any) {
					return BeticUtility.GeneratePrimitive(engine.path);
				},
				type: { base: 'String' },
			};
		},
	});
}
