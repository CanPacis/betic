import * as Path from 'https://deno.land/std@0.82.0/path/mod.ts';
import { v4 } from 'https://deno.land/std@0.82.0/uuid/mod.ts';

import {
	BeticArithmeticExpression,
	BeticAssignStatement,
	BeticConditionExpression,
	BeticExpressionStatement,
	BeticForStatement,
	BeticFunctionCallExpression,
	BeticFunctionDefinitionStatement,
	BeticIfStatement,
	BeticImportStatement,
	BeticListValueGetterExpression,
	BeticMapValueGetterExpression,
	BeticMicroCallExpression,
	BeticMicroDefinitionStatement,
	BeticPrimitiveExpression,
	BeticProgram,
	BeticProgramStatement,
	BeticQuantityModifierStatement,
	BeticReferenceExpression,
	BeticTypeDefinitionStatement,
	BeticVariableDefinitionStatement,
	IBeticArgument,
	IBeticPosition,
	IBeticPrimitiveType,
} from './type/parse.ts';
import {
	BeticCustomRepresentation,
	BeticFunctionRepresentation,
	BeticMapRepresentation,
	BeticMicroRepresentation,
	PrimitiveData,
	TypeData,
} from './type/representation.ts';
import BeticUtility from './util.ts';

interface BeticPrimitiveFrame {
	[key: string]: PrimitiveData;
}

interface BeticTypeFrame {
	[key: string]: TypeData;
}

interface Callstack {
	name: string;
	callbackfn: Function;
	body: BeticProgramStatement[];
}

export default class BeticEngine {
	content!: string;
	fileName!: string;
	parsed!: BeticProgram;
	imports: { id: string; engine: BeticEngine }[];

	primitiveFrame: BeticPrimitiveFrame[];
	typeFrame: BeticTypeFrame;
	callstack: Callstack[];
	constructor(public path: string | 'Anonymous', public system = false) {
		this.imports = [];
		this.callstack = [];
		this.primitiveFrame = [{}];
		this.typeFrame = {
			Int: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Byte: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Double: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Boolean: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			String: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Map: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			List: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Function: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Micro: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Macro: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Occult: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			None: {
				representation: {
					fields: [],
				},
				engine: null,
			},
			Void: {
				representation: {
					fields: [],
				},
				engine: null,
			},
		};

		if (this.path === 'Anonymous') {
			this.fileName = 'anonymous';
		} else {
			this.fileName = Path.parse(this.path).base;
		}
	}

	get currentFrame(): BeticPrimitiveFrame {
		return this.primitiveFrame[this.primitiveFrame.length - 1];
	}

	async init() {
		if (this.path !== 'Anonymous') {
			try {
				await Deno.stat(this.path);
			} catch (error) {
				BeticUtility.Error(
					this,
					BeticUtility.ErrorTitle.CannotOpenFile,
					`Cannot open file at destination ${this.path}`,
					'Anonymous'
				);
				Deno.exit();
			}

			this.content = new TextDecoder('utf-8').decode(await Deno.readFile(this.path));
		}

		try {
			this.parsed = await BeticUtility.Parse(this.content);
		} catch (error) {
			let message = error.message.split('\n')[4];
			let line = parseInt(message.split('line ')[1].split(' ')[0]);
			let col = parseInt(message.split('col ')[1].split(':')[0]);

			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.SyntaxError,
				`Program has a syntax error`,
				{ line, col }
			);
			Deno.exit();
		}

		await this.injectTypescriptFile('./port/system.ts');

		if (this.system == false) {
			let system = new BeticEngine(Path.join(Deno.cwd(), 'lib/system.btc'), true);
			await system.init();
			await system.start();

			this.imports.push({ id: v4.generate(), engine: system });
		}

		await this.resolveImports();
	}

	async start() {
		for await (const instruction of this.parsed.program) {
			await this.resolveStatement(instruction);
		}
	}

	async resolveImports() {
		for await (const use of this.parsed.imports) {
			switch (Path.parse(use.source.value).ext) {
				case '.btc':
					await this.injectBeticEngine(use);
					break;
				case '.typescript':
					await this.injectTypescriptFile(
						`./port/${Path.parse(use.source.value).name}.ts`
					);
					break;
				case '':
					await this.injectBeticEngine(use);
					break;
				default:
					break;
			}
		}
	}

	async injectTypescriptFile(path: string) {
		let port = (await import(path)).default;

		for (let data in port) {
			this.currentFrame[data] = port[data];
		}
	}

	async injectBeticEngine(use: BeticImportStatement) {
		let src: string;

		if (Path.isAbsolute(use.source.value)) {
			src = use.source.value;
		} else {
			if (use.source.value[0] === '.') {
				src = Path.join(Path.parse(this.path).dir, use.source.value);
			} else {
				src = Path.join(Deno.cwd(), `lib/${use.source.value}.btc`);
			}
		}

		try {
			await Deno.stat(src);
		} catch (error) {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.CannotOpenFile,
				`Cannot open file at destination ${src}`,
				use.position
			);
			Deno.exit();
		}

		let engine = new BeticEngine(src);
		await engine.init();
		await engine.start();
		this.imports.push({ id: v4.generate(), engine });
	}

	async resolveStatement(statement: BeticProgramStatement): Promise<void> {
		switch (statement.operation) {
			case 'variable_definition':
				await this.resolveVariableDefinitionStatement(statement);
				break;
			case 'type_definition':
				await this.resolveTypeDefinitionStatement(statement);
				break;
			case 'function_definition':
				await this.resolveFunctionDefinitionStatement(statement);
				break;
			case 'micro_definition':
				await this.resolveMicroDefinitionStatement(statement);
				break;
			case 'macro_definition':
				return;
			case 'for_statement':
				await this.resolveForStatement(statement);
				break;
			case 'if_statement':
				await this.resolveIfStatement(statement);
				break;
			case 'switch_statement':
				return;
			case 'assign_statement':
				await this.resolveAssignStatement(statement);
				break;
			case 'quantity_modifier':
				await this.resolveQuantityModifierStatement(statement);
				break;
			case 'try_catch_block':
				return;
			case 'comment':
				return;
			default:
				await this.resolveExpression(statement);
		}
	}

	async resolveVariableDefinitionStatement(statement: BeticVariableDefinitionStatement) {
		let value = await this.resolveExpression(statement.value);

		if (this.currentFrame[statement.name]) {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.AlreadyExists,
				`Variable '${statement.name}' already exists and cannot be reinitialized`,
				statement.position
			);
			Deno.exit();
		} else {
			value.representation.expected = statement.expected;
			value.representation.constant = statement.constant;
			this.currentFrame[statement.name] = value;
		}
	}

	async resolveTypeDefinitionStatement(statement: BeticTypeDefinitionStatement) {
		this.typeFrame[statement.name] = {
			representation: {
				fields: statement.body,
			},
			engine: null,
		};
	}

	async resolveFunctionDefinitionStatement(statement: BeticFunctionDefinitionStatement) {
		return await this.resolveVariableDefinitionStatement({
			operation: 'variable_definition',
			constant: false,
			expected: false,
			name: statement.name,
			value: {
				operation: 'primitive',
				type: { base: 'Function', of: (statement as any).type },
				body: {
					block: statement.body.block,
					provides: statement.body.provides,
				},
				arguments: statement.arguments,
				position: statement.position,
			},
			position: statement.position,
		});
	}

	async resolveMicroDefinitionStatement(statement: BeticMicroDefinitionStatement) {
		return await this.resolveVariableDefinitionStatement({
			operation: 'variable_definition',
			constant: false,
			expected: false,
			name: statement.name,
			value: {
				operation: 'primitive',
				type: { base: 'Micro', of: (statement as any).type },
				body: {
					block: statement.body.block,
					provides: statement.body.provides,
				},
				prototype: {
					type: statement.prototype.type,
					value: statement.prototype.value,
					optional: statement.prototype.optional,
				},
				position: statement.position,
			},
			position: statement.position,
		});
	}

	async resolveForStatement($for: BeticForStatement) {
		let statement = (await this.resolveExpression($for.statement)).representation;

		if (statement.type.base === 'Int') {
			for (let i = 0; i < statement.value; i++) {
				let subframe: BeticPrimitiveFrame = {
					...this.currentFrame,
					[$for.placeholder]: await BeticUtility.GeneratePrimitive(i),
				};
				this.primitiveFrame.push(subframe);
				for await (const instruction of $for.body.block) {
					await this.resolveStatement(instruction);
				}
				this.primitiveFrame.pop();
			}
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.TypeMismatch,
				`Failed for statement due to inoperable statement type ${BeticUtility.SerializeType(
					statement.type
				)}. A type of ${BeticUtility.SerializeType({
					base: 'Int',
				})} is expected in for statements`,
				$for.statement.position
			);
		}
	}

	async resolveIfStatement(statement: BeticIfStatement) {
		let condition = (await this.resolveExpression(statement.condition)).representation;

		if (condition.type.base === 'Boolean') {
			if (condition.value === true) {
				for await (const instruction of statement.body.block) {
					await this.resolveStatement(instruction);
				}
				// if (statement.body.provides) {
				// 	return this.resolveExpression(statement.body.provides.body, frame);
				// } else {
				// 	return { type: { base: 'None' }, value: 'none' };
				// }
			} else {
				let executedElif = false;

				for await (const elif of statement.elifs) {
					let condition = (await this.resolveExpression(elif.condition)).representation;

					if (condition.type.base === 'Boolean') {
						if (condition.value === true) {
							for await (const instruction of elif.body.block) {
								await this.resolveStatement(instruction);
							}
							executedElif = true;
						}
					} else {
						BeticUtility.Error(
							this,
							BeticUtility.ErrorTitle.InvalidValue,
							`Elif statement failed due to inoperable type ${BeticUtility.SerializeType(
								condition.type
							)} in condition, expected a ${BeticUtility.SerializeType({
								base: 'Boolean',
							})} type`,
							elif.condition.position
						);
						Deno.exit();
					}
				}

				if (!executedElif) {
					if (statement.else !== null) {
						for await (const instruction of statement.else.block) {
							await this.resolveStatement(instruction);
						}

						// if (statement.else.provides) {
						// 	return this.resolveExpression(statement.else.provides.body, frame);
						// } else {
						// 	return { type: { base: 'None' }, value: 'none' };
						// }
					}
				}
			}
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.InvalidValue,
				`If statement failed due to inoperable type ${BeticUtility.SerializeType(
					condition.type
				)} in condition, expected a ${BeticUtility.SerializeType({
					base: 'Boolean',
				})} type`,
				statement.condition.position
			);
			Deno.exit();
		}
	}

	async resolveAssignStatement(statement: BeticAssignStatement) {
		let left = (await this.resolveExpression(statement.left)).representation;

		if (left.constant) {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.ImmutableValue,
				`Variable you are trying to mutate is immutable`,
				statement.left.position
			);
			Deno.exit();
		} else {
			let assignment = (await this.resolveExpression(statement.right)).representation;

			if (BeticUtility.DiffTypes(left.type, assignment.type)) {
				left.value = assignment.value;
			} else {
				BeticUtility.Error(
					this,
					BeticUtility.ErrorTitle.TypeMismatch,
					`Cannot assign type ${BeticUtility.SerializeType(
						assignment.type
					)} to type ${BeticUtility.SerializeType(left.type)}`,
					statement.right.position
				);
				Deno.exit();
			}
		}
	}

	async resolveQuantityModifierStatement(modifier: BeticQuantityModifierStatement) {
		let statement = (await this.resolveExpression(modifier.statement)).representation;

		if (statement.constant) {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.ImmutableValue,
				`Variable you are trying to mutate is immutable`,
				modifier.statement.position
			);
			Deno.exit();
		} else {
			if (statement.type.base === 'Int' || statement.type.base === 'Double') {
				let right;

				if (modifier.right) {
					right = (await this.resolveExpression(modifier.right)).representation;

					if (!(right.type.base === 'Int' || right.type.base === 'Double')) {
						BeticUtility.Error(
							this,
							BeticUtility.ErrorTitle.InvalidValue,
							`Quantity modification failed due to inoperable type ${BeticUtility.SerializeType(
								right.type
							)}. Modifier needs type to be a ${BeticUtility.SerializeType({
								base: 'Int',
							})} or ${BeticUtility.SerializeType({
								base: 'Double',
							})} on the right-hand`,
							modifier.right.position
						);
						Deno.exit();
					}
				}

				let result;

				switch (modifier.type) {
					case 'increment':
						(statement.value as number)++;
						break;
					case 'decrement':
						(statement.value as number)--;
						break;
					case 'add':
						var value = statement.value as number;
						result = value += right?.value as number;
						break;
					case 'subtract':
						var value = statement.value as number;
						result = value -= right?.value as number;
						break;
					case 'divide':
						var value = statement.value as number;
						result = value /= right?.value as number;
						break;
					case 'multiply':
						var value = statement.value as number;
						result = value *= right?.value as number;
						break;
				}

				let type = {
					base: Number.isInteger(result) ? 'Int' : 'Double',
				};

				if (!(statement.type.base === 'Double' && type.base === 'Int')) {
					if (!BeticUtility.DiffTypes(statement.type, type)) {
						BeticUtility.Error(
							this,
							BeticUtility.ErrorTitle.TypeMismatch,
							`Cannot assign type ${BeticUtility.SerializeType(
								type
							)} to type ${BeticUtility.SerializeType(statement.type)}`,
							modifier.right?.position as IBeticPosition
						);
						Deno.exit();
					}
				}
				statement.value = result as number;
			} else {
				BeticUtility.Error(
					this,
					BeticUtility.ErrorTitle.InvalidValue,
					`Quantity modification failed due to inoperable type ${BeticUtility.SerializeType(
						statement.type
					)}. Modifier needs type to be a ${BeticUtility.SerializeType({
						base: 'Int',
					})} or ${BeticUtility.SerializeType({ base: 'Double' })}`,
					modifier.statement.position
				);
				Deno.exit();
			}
		}
	}

	async resolveExpression(expression: BeticExpressionStatement): Promise<PrimitiveData> {
		switch (expression.operation) {
			case 'arithmetic':
				return this.resolveArithmeticExpression(expression);
			case 'map_value_getter':
				return this.resolveMapValueGetterExpression(expression);
			case 'list_value_getter':
				return this.resolveListValueGetterExpression(expression);
			case 'function_call':
				return this.resolveFunctionCallExpression(expression);
			case 'micro_call':
				return this.resolveMicroCallExpression(expression);
			case 'macro_call':
				return BeticUtility.GeneratePrimitive(null);
			case 'condition':
				return this.resolveConditionExpression(expression);
			case 'manuel_cast':
				return BeticUtility.GeneratePrimitive(null);
			case 'primitive':
				return this.resolvePrimitiveExpression(expression);
			case 'reference':
				return (await this.resolveReferenceExpression(expression)) as PrimitiveData;
		}
	}

	async resolveArithmeticExpression(
		expression: BeticArithmeticExpression
	): Promise<PrimitiveData> {
		let left = (await this.resolveExpression(expression.left)).representation;
		let right = (await this.resolveExpression(expression.right)).representation;

		let arithmetic = (): number => {
			switch (expression.type) {
				case 'addition':
					return (left.value as number) + (right.value as number);
				case 'division':
					return (left.value as number) / (right.value as number);
				case 'exponent':
					return Math.pow(left.value as number, right.value as number);
				case 'modulus':
					return (left.value as number) % (right.value as number);
				case 'multiplication':
					return (left.value as number) * (right.value as number);
				case 'root':
					return Math.pow(left.value as number, 1 / (right.value as number));
				case 'subtraction':
					return (left.value as number) - (right.value as number);
			}
		};

		if (
			(left.type.base === 'Int' && right.type.base === 'Int') ||
			(left.type.base === 'Double' && right.type.base === 'Double')
		) {
			let value = arithmetic();
			return BeticUtility.GeneratePrimitive(value, {
				base: Number.isInteger(value) ? 'Int' : 'Double',
			});
		} else {
			if (
				left.type.base === 'String' &&
				right.type.base === 'String' &&
				expression.type === 'addition'
			) {
				return BeticUtility.GeneratePrimitive((left.value as string) + right.value);
			} else {
				BeticUtility.Error(
					this,
					BeticUtility.ErrorTitle.TypeMismatch,
					`Arithmetic operation failed due to inoperable type ${BeticUtility.SerializeType(
						left.type
					)} or ${BeticUtility.SerializeType(right.type)}`,
					expression.position
				);
				Deno.exit();
			}
		}
	}

	async resolveMapValueGetterExpression(
		expression: BeticMapValueGetterExpression
	): Promise<PrimitiveData> {
		let supleft = await this.resolveExpression(expression.left);
		let left = supleft.representation as BeticMapRepresentation;

		let unindexableTypes = [
			'Int',
			'Double',
			'String',
			'Boolean',
			'Function',
			'List',
			'Void',
			'None',
		];
		if (!unindexableTypes.includes(left.type.base)) {
			let subframe: BeticPrimitiveFrame = {};

			left.value.forEach((pair) => {
				subframe[pair.key] = pair.value;
			});

			this.primitiveFrame.push(subframe);
			let right = await this.resolveExpression(expression.right);
			right.engine = supleft.engine;
			this.primitiveFrame.pop();

			return right;
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.UnindexibleReference,
				`Variable type of ${BeticUtility.SerializeType(left.type)} cannot be indexed`,
				expression.position
			);
			Deno.exit();
		}
	}

	async resolveListValueGetterExpression(
		expression: BeticListValueGetterExpression
	): Promise<PrimitiveData> {
		let supsource = await this.resolveExpression(expression.source);
		let source = supsource.representation;

		if (
			source.type.base === 'List' ||
			source.type.base === 'Map' ||
			source.type.base === 'String'
		) {
			let index = (await this.resolveExpression(expression.index)).representation;

			if (source.type.base === 'Map') {
				if (index.type.base === 'String') {
					let result = (source as BeticMapRepresentation).value.find(
						(pair) => pair.key === index.value
					)?.value;

					if (result) {
						result.engine = supsource.engine;
						return result;
					} else {
						BeticUtility.Error(
							this,
							BeticUtility.ErrorTitle.InvalidValue,
							`Index value '${index.value}' is out of bounds of source`,
							expression.index.position
						);
						Deno.exit();
					}
				} else {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.InvalidValue,
						`Cannot index a ${BeticUtility.SerializeType(
							source.type
						)} source with type ${BeticUtility.SerializeType(index.type)}`,
						expression.index.position
					);
					Deno.exit();
				}
			} else {
				if (index.type.base === 'Int') {
					let result: PrimitiveData | undefined;

					if (source.type.base === 'List') {
						let value: PrimitiveData = (source.value as [])[index.value as number];

						value.engine = supsource.engine;
						result = value;
					} else {
						let value: string = (source.value as [])[index.value as number];

						if (value) {
							let single = await BeticUtility.GeneratePrimitive(value);
							single.engine = supsource.engine;
							result = single;
						} else {
							result = undefined;
						}
					}

					if (result) {
						return result;
					} else {
						BeticUtility.Error(
							this,
							BeticUtility.ErrorTitle.InvalidValue,
							`Index value '${index.value}' is out of bounds of source`,
							expression.index.position
						);
						Deno.exit();
					}
				} else {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.InvalidValue,
						`Cannot index a source with type ${BeticUtility.SerializeType(index.type)}`,
						expression.index.position
					);
					Deno.exit();
				}
			}
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.UnindexibleReference,
				`Variable type of ${BeticUtility.SerializeType(source.type)} cannot be indexed`,
				expression.position
			);
			Deno.exit();
		}
	}

	async resolveFunctionCallExpression(
		expression: BeticFunctionCallExpression
	): Promise<PrimitiveData> {
		let name = await this.resolveExpression(expression.name);

		if (name.representation.type.base == 'Function') {
			let args: PrimitiveData[] = [];

			for await (const arg of expression.arguments) {
				args.push(await this.resolveExpression(arg));
			}

			if (name.engine === null) {
				return await this.runFunction(expression, args);
			} else {
				let use = this.imports.find((use) => use.id === name.engine);
				if (use) {
					return await use.engine.runFunction(expression, args);
				}
			}
			return BeticUtility.GeneratePrimitive(null);
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.InvalidValue,
				`This expression type ${BeticUtility.SerializeType(
					name.representation.type
				)} cannot be called as a function`,
				expression.name.position
			);
			Deno.exit();
		}
	}

	async resolveMicroCallExpression(expression: BeticMicroCallExpression): Promise<PrimitiveData> {
		let supname = await this.resolveExpression(expression.name);
		let name = supname.representation as BeticMicroRepresentation;

		if (name.type.base === 'Micro') {
			let arg = await this.resolveExpression(expression.arguments[0]);

			if (supname.engine === null) {
			} else {
				let use = this.imports.find((use) => use.id === supname.engine);
				if (use) {
					return await use.engine.runMicro(expression, arg);
				}
			}
			return BeticUtility.GeneratePrimitive(null);
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.InvalidValue,
				`This expression type ${BeticUtility.SerializeType(
					name.type
				)} cannot be called as a micro`,
				expression.name.position
			);
			Deno.exit();
		}
	}

	async resolveConditionExpression(expression: BeticConditionExpression): Promise<PrimitiveData> {
		let left = (await this.resolveExpression(expression.left)).representation;
		let right = (await this.resolveExpression(expression.right)).representation;

		let error = (type: IBeticPrimitiveType, position: IBeticPosition) => {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.InvalidValue,
				`Condition operation failed due to inoperable type ${BeticUtility.SerializeType(
					type
				)}`,
				position
			);
		};

		let booleanConditions = ['and', 'or', 'nand', 'nor'];
		if (booleanConditions.includes(expression.type)) {
			if (left.type.base === 'Boolean') {
				if (right.type.base === 'Boolean') {
					switch (expression.type) {
						case 'and':
							return BeticUtility.GeneratePrimitive(
								(left.value as boolean) && (right.value as boolean)
							);
						case 'or':
							return BeticUtility.GeneratePrimitive(
								(left.value as boolean) || (right.value as boolean)
							);
						case 'nand':
							return BeticUtility.GeneratePrimitive(
								!((left.value as boolean) && (right.value as boolean))
							);
						case 'nor':
							return BeticUtility.GeneratePrimitive(
								!((left.value as boolean) || (right.value as boolean))
							);
						default:
							return BeticUtility.GeneratePrimitive(false);
					}
				} else {
					error(right.type, expression.right.position);
					Deno.exit();
				}
			} else {
				error(left.type, expression.left.position);
				Deno.exit();
			}
		} else if (expression.type === 'equals' || expression.type === 'not_equals') {
			switch (expression.type) {
				case 'equals':
					return BeticUtility.GeneratePrimitive(left.value === right.value);
				case 'not_equals':
					return BeticUtility.GeneratePrimitive(left.value !== right.value);
			}
		} else {
			if (left.type.base === 'Int' || left.type.base === 'Double') {
				if (right.type.base === 'Int' || right.type.base === 'Double') {
					switch (expression.type) {
						case 'less_than':
							return BeticUtility.GeneratePrimitive(left.value < right.value);
						case 'greater_than':
							return BeticUtility.GeneratePrimitive(left.value > right.value);
						case 'less_than_equals':
							return BeticUtility.GeneratePrimitive(left.value <= right.value);
						case 'greater_than_equals':
							return BeticUtility.GeneratePrimitive(left.value >= right.value);
						case 'not_less_than':
							return BeticUtility.GeneratePrimitive(!(left.value < right.value));
						case 'not_greater_than':
							return BeticUtility.GeneratePrimitive(!(left.value > right.value));
						case 'not_less_than_equals':
							return BeticUtility.GeneratePrimitive(!(left.value <= right.value));
						case 'not_greater_than_equals':
							return BeticUtility.GeneratePrimitive(!(left.value >= right.value));
						default:
							return BeticUtility.GeneratePrimitive(false);
					}
				} else {
					error(right.type, expression.right.position);
					Deno.exit();
				}
			} else {
				error(left.type, expression.left.position);
				Deno.exit();
			}
		}
	}

	async runFunction(
		expression: BeticFunctionCallExpression,
		args: PrimitiveData[]
	): Promise<PrimitiveData> {
		let name = await this.resolveExpression(expression.name);
		let type = name.representation.value.constructor.name;
		let func = name.representation as BeticFunctionRepresentation;

		let subframe: BeticPrimitiveFrame = { ...this.currentFrame };
		func.arguments.forEach((arg, i) => {
			if (args[i]) {
				if (BeticUtility.DiffTypes(args[i].representation.type, arg.type)) {
					subframe[arg.value] = args[i];
				} else {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.TypeMismatch,
						`Function expects parameter '${
							arg.value
						}' to be type ${BeticUtility.SerializeType(
							arg.type
						)} but type ${BeticUtility.SerializeType(
							args[i].representation.type
						)} is given`,
						expression.position
					);
					Deno.exit();
				}
			} else {
				if (!arg.optional) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.MissingArgument,
						`Function expected a value for parameter '${
							arg.value
						}' (${BeticUtility.SerializeType(arg.type)})`,
						expression.position
					);
					Deno.exit();
				}
			}
		});

		if (type === 'Function' || type === 'AsyncFunction') {
			try {
				return (name.representation.value as Function)(this, ...args);
			} catch (error) {
				BeticUtility.Error(this, BeticUtility.ErrorTitle.RuntimeError, error.message, {
					line: 1,
					col: 1,
				});
				Deno.exit();
			}
		} else if (type === 'Array') {
			this.primitiveFrame.push(subframe);
			for await (const instruction of func.value) {
				await this.resolveStatement(instruction);
			}

			if (func.provides) {
				let provides = await this.resolveExpression(func.provides.body);
				this.primitiveFrame.pop();
				if (provides) {
					return provides;
				} else {
					return BeticUtility.GeneratePrimitive(null);
				}
			} else {
				this.primitiveFrame.pop();
				return BeticUtility.GeneratePrimitive(null);
			}
		}

		return BeticUtility.GeneratePrimitive(null);
	}

	async runMicro(
		expression: BeticMicroCallExpression,
		arg: PrimitiveData
	): Promise<PrimitiveData> {
		let name = await this.resolveExpression(expression.name);
		let micro = name.representation as BeticMicroRepresentation;

		let subframe: BeticPrimitiveFrame = { ...this.currentFrame };

		if (BeticUtility.DiffTypes(micro.prototype.type, arg.representation.type)) {
			this.primitiveFrame.push(subframe);
			this.currentFrame[micro.prototype.value] = arg;
			for await (const instruction of micro.value) {
				await this.resolveStatement(instruction);
			}

			if (micro.provides) {
				let provides = await this.resolveExpression(micro.provides.body);
				this.primitiveFrame.pop();
				if (provides) {
					return provides;
				} else {
					return BeticUtility.GeneratePrimitive(null);
				}
			} else {
				this.primitiveFrame.pop();
				return BeticUtility.GeneratePrimitive(null);
			}
		} else {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.TypeMismatch,
				`Micro expects parameter prototype to be type ${BeticUtility.SerializeType(
					micro.prototype.type
				)} but type ${BeticUtility.SerializeType(arg.representation.type)} is given`,
				expression.position
			);
			Deno.exit();
		}
		// func.arguments.forEach((arg, i) => {
		// 	if (args[i]) {
		// 		if (BeticUtility.DiffTypes(args[i].representation.type, arg.type)) {
		// 			subframe[arg.value] = args[i];
		// 		} else {
		// 			BeticUtility.Error(
		// 				this,
		// 				BeticUtility.ErrorTitle.TypeMismatch,
		// 				`Function expects parameter '${
		// 					arg.value
		// 				}' to be type ${BeticUtility.SerializeType(
		// 					arg.type
		// 				)} but type ${BeticUtility.SerializeType(
		// 					args[i].representation.type
		// 				)} is given`,
		// 				expression.position
		// 			);
		// 			Deno.exit();
		// 		}
		// 	} else {
		// 		if (!arg.optional) {
		// 			BeticUtility.Error(
		// 				this,
		// 				BeticUtility.ErrorTitle.MissingArgument,
		// 				`Function expected a value for parameter '${
		// 					arg.value
		// 				}' (${BeticUtility.SerializeType(arg.type)})`,
		// 				expression.position
		// 			);
		// 			Deno.exit();
		// 		}
		// 	}
		// });
	}

	async resolvePrimitiveExpression(expression: BeticPrimitiveExpression): Promise<PrimitiveData> {
		switch (expression.type.base) {
			case 'Int':
				return await BeticUtility.GeneratePrimitive(parseInt(expression.value as string));
			case 'Double':
				return await BeticUtility.GeneratePrimitive(
					parseFloat(expression.value as string),
					{ base: 'Double' }
				);
			case 'Boolean':
				return await BeticUtility.GeneratePrimitive(
					(expression.value as string) === 'true'
				);
			case 'String':
				return await BeticUtility.GeneratePrimitive(expression.value as string);
			case 'List':
				let listValue: PrimitiveData[] = [];
				for await (const v of expression.value as []) {
					listValue.push(await this.resolveExpression(v));
				}

				listValue.forEach(async (v) => {
					if (expression.type.of) {
						if (!BeticUtility.DiffTypes(v.representation.type, expression.type.of)) {
							BeticUtility.Error(
								this,
								BeticUtility.ErrorTitle.TypeMismatch,
								`A member of type ${BeticUtility.SerializeType(
									v.representation.type
								)} cannot be put in type ${BeticUtility.SerializeType(
									expression.type
								)}`,
								expression.position
							);
							Deno.exit();
						}
					} else {
						throw Error('Base list needs an of type');
					}
				});

				return {
					representation: {
						type: {
							base: expression.type.base,
							of: expression.type.of as IBeticPrimitiveType,
						},
						value: listValue,
						expected: false,
						constant: false,
					},
					engine: null,
				};
			case 'Map':
				var value = expression.value as {
					key: string;
					value: BeticExpressionStatement;
				}[];

				var mapKeys = value.map((pair) => pair.key);

				var mapValues: PrimitiveData[] = [];
				for await (const pair of value) {
					mapValues.push(await this.resolveExpression(pair.value));
				}

				mapValues.forEach(async (v) => {
					if (expression.type.of) {
						if (!BeticUtility.DiffTypes(v.representation.type, expression.type.of)) {
							BeticUtility.Error(
								this,
								BeticUtility.ErrorTitle.TypeMismatch,
								`A member of type ${BeticUtility.SerializeType(
									v.representation.type
								)} cannot be put in type ${BeticUtility.SerializeType(
									expression.type
								)}`,
								expression.position
							);
							Deno.exit();
						}
					} else {
						throw Error('Base list needs an of type');
					}
				});

				if (new Set(mapKeys).size !== mapKeys.length) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.DuplicateKeys,
						`Map includes duplicate keys`,
						expression.position
					);
					Deno.exit();
				}

				return {
					representation: {
						type: { base: 'Map', of: expression.type.of as IBeticPrimitiveType },
						value: mapKeys.map((key, i) => ({ key, value: mapValues[i] })),
						expected: false,
						constant: false,
					},
					engine: null,
				};
			case 'Function':
				this.checkTypeReference(
					expression.type.of as IBeticPrimitiveType,
					expression.position
				);

				if (expression.type.of?.base === 'Void' && expression.body?.provides !== null) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.TypeMismatch,
						`A function with return type ${BeticUtility.SerializeType(
							expression.type.of
						)} must not provide a value`,
						expression.body?.provides.position as IBeticPosition
					);
					Deno.exit();
				}

				if (expression.type.of?.base !== 'Void' && expression.body?.provides === null) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.TypeMismatch,
						`A function with return type ${BeticUtility.SerializeType(
							expression.type.of as IBeticPrimitiveType
						)} must provide a value`,
						expression.position
					);
					Deno.exit();
				}

				expression.arguments?.forEach((arg) => {
					this.checkTypeReference(arg.type, expression.position);
				});

				return {
					representation: {
						type: { base: 'Function', of: expression.type.of as IBeticPrimitiveType },
						value: expression.body?.block as BeticProgramStatement[],
						arguments: expression.arguments as IBeticArgument[],
						provides: expression.body?.provides as {
							body: BeticExpressionStatement;
							position: IBeticPosition;
						},
						constant: false,
						expected: false,
					},
					engine: null,
				};
			case 'Micro':
				this.checkTypeReference(
					expression.type.of as IBeticPrimitiveType,
					expression.position
				);

				if (expression.type.of?.base === 'Void' && expression.body?.provides !== null) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.TypeMismatch,
						`A function with return type ${BeticUtility.SerializeType(
							expression.type.of
						)} must not provide a value`,
						expression.body?.provides.position as IBeticPosition
					);
					Deno.exit();
				}

				if (expression.type.of?.base !== 'Void' && expression.body?.provides === null) {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.TypeMismatch,
						`A function with return type ${BeticUtility.SerializeType(
							expression.type.of as IBeticPrimitiveType
						)} must provide a value`,
						expression.position
					);
					Deno.exit();
				}

				return {
					representation: {
						type: { base: 'Micro', of: expression.type.of },
						/* @ts-ignore */
						value: expression.body?.block,
						/* @ts-ignore */
						prototype: expression.prototype,
						/* @ts-ignore */
						provides: expression.body?.provides,
						constant: false,
						expected: false,
					},
					engine: null,
				};
			default:
				let type = await this.findTypeReference(expression.type, expression.position);

				if (type) {
					let result: BeticCustomRepresentation = {
						type: expression.type,
						value: [],
						constant: false,
						expected: false,
					};

					for await (const field of type.representation.fields) {
						let values = expression.value as {
							key: string;
							value: BeticExpressionStatement;
							position: IBeticPosition;
						}[];

						let raw = values.find((pair) => pair.key === field.value);

						if (raw) {
							let value = await this.resolveExpression(raw.value);

							if (BeticUtility.DiffTypes(value.representation.type, field.type)) {
								result.value.push({ key: field.value, value });
							} else {
								BeticUtility.Error(
									this,
									BeticUtility.ErrorTitle.TypeMismatch,
									`Cannot assign type ${BeticUtility.SerializeType(
										value.representation.type
									)} to type ${BeticUtility.SerializeType(
										field.type
									)} in ${BeticUtility.SerializeType(expression.type)} type`,
									raw.position
								);
								Deno.exit();
							}
						} else {
							if (!field.optional) {
								BeticUtility.Error(
									this,
									BeticUtility.ErrorTitle.MissingProperty,
									`Variable type ${BeticUtility.SerializeType(
										expression.type
									)} is missing property '${field.value}'`,
									expression.position
								);
								Deno.exit();
							}
						}
					}
					return {
						representation: result,
						engine: null,
					};
				} else {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.UninitializedValue,
						`Type ${BeticUtility.SerializeType(expression.type)} cannot be found`,
						expression.position
					);
					Deno.exit();
				}
		}
	}

	async resolveReferenceExpression(
		expression: BeticReferenceExpression,
		request = false
	): Promise<PrimitiveData | null> {
		if (this.currentFrame[expression.value]) {
			return this.currentFrame[expression.value];
		} else {
			let valid;
			if (!request) {
				for await (const use of this.imports) {
					try {
						let distantValue = await use.engine.resolveReferenceExpression(
							expression,
							true
						);
						if (distantValue) {
							distantValue.engine = use.id;
							valid = distantValue;
						}
					} catch (error) {}
				}
			}
			if (valid) {
				return valid;
			} else {
				if (request) {
					return null;
				} else {
					BeticUtility.Error(
						this,
						BeticUtility.ErrorTitle.UninitializedValue,
						`Reference value '${expression.value}' cannot be found in frame`,
						expression.position
					);
					Deno.exit();
				}
			}
		}
	}

	async checkTypeReference(type: IBeticPrimitiveType, position: IBeticPosition) {
		if (!(await this.findTypeReference(type, position))) {
			BeticUtility.Error(
				this,
				BeticUtility.ErrorTitle.UninitializedValue,
				`Type ${BeticUtility.SerializeType(type)} cannot be found`,
				position
			);
			Deno.exit();
		}
	}

	async findTypeReference(
		type: IBeticPrimitiveType,
		position: IBeticPosition,
		request = false
	): Promise<TypeData | null> {
		if (!this.typeFrame[type.base]) {
			let valid;

			for await (const use of this.imports) {
				try {
					let distantValue = await use.engine.findTypeReference(type, position, true);
					if (distantValue) {
						distantValue.engine = use.id;
						valid = distantValue;
					}
				} catch (error) {}
			}

			if (valid) {
				return valid;
			} else {
				return null;
			}
		} else {
			return this.typeFrame[type.base];
		}
	}
}
