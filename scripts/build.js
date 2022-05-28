// 把 package 目录下所有得包进行打包

const fs = require("fs");
const execa = require("execa");
const target = fs.readdirSync("packages").filter((f) => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false;
  }
  return true;
});

// 对目标进行一次打包，并行打包

async function build(target) {
  await execa("rollup", ["-c", "--environment", `TARGET:${target}`], {
    stdio: "inherit",
  });
  console.log(target);
}
function runParallel(target, iteratorFn) {
  const res = [];
  for (const item of target) {
    const p = iteratorFn(item);
    res.push(p);
  }
  return Promise.all(res);
}
runParallel(target, build);