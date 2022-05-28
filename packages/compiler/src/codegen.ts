
import { capitalize } from "@mini-vue/shared";
import { ElementTypes, NodeTypes } from "./ast";

export function generate(ast) {
  const returns = traverseNode(ast, null)
  const code = `
  with(ctx){
    const { h, Text , Fragment , renderList ,resolveComponent}=MiniVue;
    console.log(MiniVue)
    return ${returns}
  }
  `
  return code;
}

function traverseNode(node, parent) {

  switch (node.type) {
    case NodeTypes.ROOT:
      if (node.children.length === 1) {
        return traverseNode(node.children[0], node)
      }
      const result = traverseChildren(node)
      return result
    case NodeTypes.ELEMENT:
      return resolveElementASTVNode(node, parent)
    case NodeTypes.INTERPOLATION:
      return createTextVNode(node.content)
    case NodeTypes.TEXT:
      return createTextVNode(node)
  }
}
function resolveElementASTVNode(node, parent) {
  const forNode = pluck(node.directives, 'for')
  const ifNode = pluck(node.directives, 'if')||pluck(node.directives, 'else-if')
  if (ifNode) {
    let consequent = resolveElementASTVNode(node, parent);
    let alternate ;
    const { children } = parent;
    let i = children.findIndex(child => child === node) + 1;
    for (; i < children.length; i++) {
      const sibling = children[i]
      if (sibling.type == NodeTypes.TEXT && !sibling.content.trim()) {
        children.splice(i, 1)
        i--;
        continue;
      }
      if (sibling.type === NodeTypes.ELEMENT) {
        if (pluck(sibling.directives, 'else')) {
          alternate = resolveElementASTVNode(sibling, parent)
          children.splice(i, 1)
        }else if(pluck(sibling.directives, 'else-if',false)){
          alternate = resolveElementASTVNode(sibling, parent)
          children.splice(i, 1)
        }
      }
      break;
    }
    const { exp } = ifNode;
    return `${exp.content}?${consequent}:${alternate||= createTextVNode(Text)}`
  }
  if (forNode) {

    const { exp } = forNode
    const [args, source] = exp.content.split(/\sin\s|\sin\s/)
    return `h(Fragment,
      null,
      renderList(${source},${args}=>${resolveElementASTVNode(node, parent)}))`
  }
  return createElementVNode(node)
}
function pluck(directives, name, remove = true) {
  const index = directives.findIndex((dir) => dir.name === name)
  const dir = directives[index]
  if (index > -1 && remove) {
    directives.splice(index, 1)
  }
  return dir;
}
function createTextVNode(node) {
  const child = createText(node)
  return `h(Text,null,${child})`
}

function createText({ isStatic = true, content = '' }) {
  return isStatic ? JSON.stringify(content) : content
}
function createElementVNode(node) {
  const { children,tagType } = node;
  const tag =tagType==ElementTypes.ELEMENT ? `"${node.tag}"`:`resolveComponent("${node.tag}")`

  const vModel=pluck(node.directives,'model')

  const propArr = createPropsArray(node)

  let propStr = propArr.length ? `{${propArr.join(',')}}` : 'null';
  if(vModel){
    const getter = `()=>${createText(vModel.exp)}`
    const setter = `value =>${createText(vModel.exp)}`
    propStr = `widthWodel(${tag},${propStr},${getter},${setter})`
  }
  if (!children.length) {
    if (propStr == 'null') {
      return `h(${tag})`
    } else {
      return `h(${tag},${propStr})`
    }

  }
  let childrenStr = traverseChildren(node);
  return `h(${tag},${propStr},${childrenStr})`
}
function createPropsArray(node) {
  const { props, directives } = node;

  console.log();

  return [...directives.map(dir => {
    switch (dir.name) {
      case 'bind':
        return `${dir.arg.content}:${createText(dir.exp)}`
      case 'on':
        const eventName = `on${capitalize(dir.arg.content)}`
        let exp = dir.exp.content;
        if (/\([^)]*?\)$/.test(exp) && !exp.includes('=>')) {
          exp = `$event=>(${exp})`
        }
        return `${eventName}:${exp}`
      case 'html':
        console.log(`innerHTML:${createText(dir.exp)}`)
        return `innerHTML:${createText(dir.exp)}`
      default:
        return `${dir.name}:${createText(dir.exp)}`
    }
  }), ...props.map(prop => `${prop.name}:${createText(prop.value)}`)]

}
function traverseChildren(node) {
  const { children } = node

  if (children.length == 1) {
    const child = children[0]
    if (NodeTypes.TEXT === child.type) {
      return createText(child)
    }
    if (NodeTypes.INTERPOLATION === child.type) {
      return createText(child.content)
    }
  }
  const retults = []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    retults.push(traverseNode(child, node))
  }
  return `[${retults.join(',')}]`
}