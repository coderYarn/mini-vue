const args = require("minimist")(process.argv.slice(2))
const {resolve}  = require('path')
const {build} = require("esbuild")
const target = args._[0] || "reactivity"
const format = args.f || 'global'

const pkg = require(resolve(__dirname,`../packages/${target}/package.json`))

const outputFormat = format.startsWith('global')?'iife':format=='cjs'?'cjs':'esm'
console.log(outputFormat);

const outfile = resolve(__dirname,`../packages/${target}/dist/${target}.${format}.js`)
console.log("pkg.buildOptions?.name",pkg.buildOptions?.name);
build({
  entryPoints:[resolve(__dirname,`../packages/${target}/src/index.ts`)],
  outfile,
  bundle:true,
  sourcemap:true,
  globalName:'MiniVue',
  platform:format==='cjs'?'node':'browser',
  format:outputFormat,
  watch:{
    onRebuild(error){
      if(!error)console.log(`rebuild~~`);
      
    }
  }
}).then(()=>{
  console.log("watching~~~");
})