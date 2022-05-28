const queue = []
let isFlushing = false
const resolvePromise = Promise.resolve()
let currentFlushPromise = null;
export function nextTick(fn){
  const p = currentFlushPromise || resolvePromise
  return p.then(fn)
}

export function queueJob(job) {
  if(!queue.length || !queue.includes(job)){
    queue.push(job)
    queueFlush()
  }
}
function queueFlush(){
  if(!isFlushing){
    isFlushing=true
    currentFlushPromise = resolvePromise.then(flushJobs)
  }
}
function flushJobs(){

  try{
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      job()
    }
  }finally{
    isFlushing=false
    queue.length = 0;
    currentFlushPromise = null
  }
}