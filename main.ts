import BeticEngine from './engine.ts';

let engine = new BeticEngine(Deno.args[0]);
await engine.init();
await engine.start();

// console.log(engine.imports[0])
