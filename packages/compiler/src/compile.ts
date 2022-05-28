import { generate } from "./codegen";
import { parse } from "./parse";

export function compile(template){
  const ast = parse(template)
  return  generate(ast)
}