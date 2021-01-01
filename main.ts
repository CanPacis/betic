import * as Colors from 'https://deno.land/std@0.82.0/fmt/colors.ts';
import BeticEngine, { Callstack } from './engine.ts';
import BeticUtility from './util.ts';

let engines: { id: string; engine: BeticEngine; entry: boolean }[] = [];
let globalCallstack: Callstack[] = [];
BeticUtility.OnError = () => {
	let findEngine = (id: string): { id: string; engine: BeticEngine; entry: boolean } | null => {
		let e = engines.find((e) => e.id === id);
		return e || null;
	};

	let serialize = (call: any): string | null => {
		let e = findEngine(call.id);
		if (call.type !== 'init' || e?.entry) {
			return `\t${Colors.red(call.type)} ${call.type === 'micro' ? '.' : ''}${call.name}${
				call.type === 'function' ? '()' : ''
			} ${e?.engine.path || ''}`;
		} else {
			return null;
		}
	};

	console.log(Colors.gray('Callstack:'));
	console.log(
		globalCallstack
			.map(serialize)
			.filter((s) => s !== null)
			.reverse()
			.join('\n')
	);
};

let engine = new BeticEngine(Deno.args[0], {
	push(callstack: Callstack) {
		globalCallstack.push(callstack);
	},
	pop() {
		globalCallstack.pop();
	},
});
await engine.init();

engines.push({ id: engine.id, engine, entry: true });
engine.imports.forEach((use) => {
	engines.push({ id: use.id, engine: use.engine, entry: false });
});

await engine.run();
