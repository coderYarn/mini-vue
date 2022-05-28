var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// packages/reactivity/src/effect.ts
var effectStack = [];
var activeEffect;
function effect(fn, option = {}) {
  const effectFn = () => {
    try {
      effectStack.push(effectFn);
      activeEffect = effectFn;
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
    }
  };
  if (!option.lazy) {
    effectFn();
  }
  effectFn.scheduler = option.scheduler;
  return effectFn;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, dep = /* @__PURE__ */ new Set());
  }
  dep.add(activeEffect);
}
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  dep.forEach((effectFn) => {
    if (effectFn.scheduler) {
      effectFn.scheduler(effectFn);
    } else {
      effectFn();
    }
  });
}

// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value === "function";
}
function isArray(value) {
  return Array.isArray(value);
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
function hasChanged(value, oldValue) {
  return value !== oldValue && (value === value || oldValue === oldValue);
}
var camelizeRE = /-(\w)/g;
function camelize(str) {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
}
function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  if (!isObject(target)) {
    return target;
  }
  if (isReactive(target)) {
    return target;
  }
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }
  const proxy = new Proxy(target, {
    get(target2, key, receiver) {
      if (key === "__isReactive") {
        return true;
      }
      track(target2, key);
      const res = Reflect.get(target2, key, receiver);
      return isObject(res) ? reactive(res) : res;
    },
    set(target2, key, value, receiver) {
      const oldValue = target2[key];
      const oldLength = target2.length;
      const res = Reflect.set(target2, key, value, receiver);
      if (hasChanged(value, oldValue)) {
        trigger(target2, key);
        if (isArray(target2) && target2.length !== oldLength) {
          trigger(target2, "length");
        }
      }
      return res;
    }
  });
  reactiveMap.set(target, proxy);
  return proxy;
}
function isReactive(target) {
  return !!(target && target.__isReactive);
}

// packages/reactivity/src/ref.ts
function ref(value) {
  if (isRef(value)) {
    return value;
  }
  return new RefImpl(value);
}
function isRef(value) {
  return !!(value && value.__isRef);
}
var RefImpl = class {
  constructor(value) {
    this.__isRef = true;
    this._value = convert(value);
  }
  get value() {
    track(this, "value");
    return this._value;
  }
  set value(val) {
    if (hasChanged(val, this._value)) {
      this._value = convert(val);
      trigger(this, "value");
    }
  }
};
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

// packages/reactivity/src/computed.ts
function computed(getterOrOptions) {
  let getter, setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {
      console.warn("Write operation failed: computed value is readonly");
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this._setter = setter;
    this._value = void 0;
    this._dirty = true;
    this.effect = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true;
          trigger(this, "value");
        }
      }
    });
  }
  get value() {
    if (this._dirty) {
      this._value = this.effect();
      this._dirty = false;
      track(this, "value");
    }
    return this._value;
  }
  set value(val) {
    this._setter(val);
  }
};

// packages/runtime-core/src/vnode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
var ShapeFlags = {
  ELEMENT: 1,
  TEXT: 1 << 1,
  FRAGMENT: 1 << 2,
  COMPONENT: 1 << 3,
  TEXT_CHILDREN: 1 << 4,
  ARRAY_CHILDREN: 1 << 5,
  CHILDREN: 1 << 4 | 1 << 5
};
function h(type, props = null, children = null) {
  let shapeFlag = 0;
  if (isString(type)) {
    shapeFlag = ShapeFlags.ELEMENT;
  } else if (type === Text) {
    shapeFlag = ShapeFlags.TEXT;
  } else if (type === Fragment) {
    shapeFlag = ShapeFlags.FRAGMENT;
  } else {
    shapeFlag = ShapeFlags.COMPONENT;
  }
  if (typeof children === "string" || typeof children === "number") {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    children = children.toString();
  } else if (Array.isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }
  if (props) {
    if (isReactive(props)) {
      props = Object.assign({}, props);
    }
    if (isReactive(props.style)) {
      props.style = Object.assign({}, props.style);
    }
  }
  return {
    type,
    props,
    children,
    shapeFlag,
    el: null,
    anchor: null,
    key: props && (props.key != null ? props.key : null),
    component: null
  };
}
function normalizeVNode(result) {
  if (Array.isArray(result)) {
    return h(Fragment, null, result);
  }
  if (isObject(result)) {
    return result;
  }
  return h(Text, null, result.toString());
}

// packages/runtime-core/src/patchProps.ts
function patchProps(el, oldProps, newProps) {
  if (oldProps === newProps) {
    return;
  }
  oldProps = oldProps || {};
  newProps = newProps || {};
  for (const key in newProps) {
    if (key === "key") {
      continue;
    }
    const prev = oldProps[key];
    const next = newProps[key];
    if (prev !== next) {
      patchDomProp(el, key, prev, next);
    }
  }
  for (const key in oldProps) {
    if (key !== "key" && !(key in newProps)) {
      patchDomProp(el, key, oldProps[key], null);
    }
  }
}
var domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
function patchDomProp(el, key, prev, next) {
  switch (key) {
    case "class":
      el.className = next || "";
      break;
    case "style":
      if (!next) {
        el.removeAttribute("style");
      } else {
        for (const styleName in next) {
          el.style[styleName] = next[styleName];
        }
        if (prev) {
          for (const styleName in prev) {
            if (next[styleName] == null) {
              el.style[styleName] = "";
            }
          }
        }
      }
      break;
    default:
      if (/^on[^a-z]/.test(key)) {
        if (prev !== next) {
          const eventName = key.slice(2).toLowerCase();
          if (prev) {
            el.removeEventListener(eventName, prev);
          }
          if (next) {
            el.addEventListener(eventName, next);
          }
        }
      } else if (domPropsRE.test(key)) {
        if (next === "" && typeof el[key] === "boolean") {
          next = true;
        }
        el[key] = next;
      } else {
        if (next == null || next === false) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, next);
        }
      }
      break;
  }
}

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvePromise = Promise.resolve();
var currentFlushPromise = null;
function nextTick(fn) {
  const p = currentFlushPromise || resolvePromise;
  return p.then(fn);
}
function queueJob(job) {
  if (!queue.length || !queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}
function queueFlush() {
  if (!isFlushing) {
    isFlushing = true;
    currentFlushPromise = resolvePromise.then(flushJobs);
  }
}
function flushJobs() {
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      job();
    }
  } finally {
    isFlushing = false;
    queue.length = 0;
    currentFlushPromise = null;
  }
}

// packages/compiler/src/ast.ts
var NodeTypes = {
  ROOT: "ROOT",
  ELEMENT: "ELEMENT",
  TEXT: "TEXT",
  SIMPLE_EXPRESSION: "SIMPLE_EXPRESSION",
  INTERPOLATION: "INTERPOLATION",
  ATTRIBUTE: "ATTRIBUTE",
  DIRECTIVE: "DIRECTIVE"
};
var ElementTypes = {
  ELEMENT: "ELEMENT",
  COMPONENT: "COMPONENT"
};
function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children
  };
}

// packages/compiler/src/parse.ts
function parse(content) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}
function createParserContext(content) {
  return {
    options: {
      delimiters: ["{{", "}}"],
      isVoidTag,
      isNativeTag
    },
    source: content
  };
}
function parseChildren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const s = context.source;
    let node;
    if (s.startsWith(context.options.delimiters[0])) {
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      node = parseElement(context);
    } else {
      node = parseText(context);
    }
    nodes.push(node);
  }
  let removedWhitespace = false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        const prev = nodes[i - 1];
        const next = nodes[i + 1];
        if (!prev || !next || prev.type === NodeTypes.ELEMENT && next.type === NodeTypes.ELEMENT && /[\r\n]/.test(node.content)) {
          removedWhitespace = true;
          nodes[i] = null;
        } else {
          node.content = " ";
        }
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
      }
    }
  }
  return removedWhitespace ? nodes.filter(Boolean) : nodes;
}
function isEnd(context) {
  const s = context.source;
  return s.startsWith("</") || !s;
}
function parseInterpolation(context) {
  const [open, close] = context.options.delimiters;
  advanceBy(context, open.length);
  const closeIndex = context.source.indexOf(close);
  const content = parseTextData(context, closeIndex).trim();
  advanceBy(context, close.length);
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      content
    }
  };
}
function parseElement(context) {
  const element = parseTag(context);
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    return element;
  }
  element.children = parseChildren(context);
  parseTag(context);
  return element;
}
function parseTag(context) {
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceSpaces(context);
  const { props, directives } = parseAttributes(context);
  const isSelfClosing = context.source.startsWith("/>");
  advanceBy(context, isSelfClosing ? 2 : 1);
  const tagType = isComponent(tag, context) ? ElementTypes.COMPONENT : ElementTypes.ELEMENT;
  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType,
    props,
    directives,
    isSelfClosing,
    children: []
  };
}
function isComponent(tag, context) {
  const { options } = context;
  return !options.isNativeTag(tag);
}
function parseAttributes(context) {
  const props = [];
  const directives = [];
  while (context.source.length && !context.source.startsWith(">") && !context.source.startsWith("/>")) {
    const attr = parseAttribute(context);
    if (attr.type === NodeTypes.ATTRIBUTE) {
      props.push(attr);
    } else {
      directives.push(attr);
    }
  }
  return { props, directives };
}
function parseAttribute(context) {
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  advanceBy(context, name.length);
  advanceSpaces(context);
  let value;
  if (context.source[0] === "=") {
    advanceBy(context, 1);
    advanceSpaces(context);
    value = parseAttributeValue(context);
    advanceSpaces(context);
  }
  if (/^(v-|:|@)/.test(name)) {
    let dirName, argContent;
    if (name[0] === ":") {
      dirName = "bind";
      argContent = name.slice(1);
    } else if (name[0] === "@") {
      dirName = "on";
      argContent = name.slice(1);
    } else if (name.startsWith("v-")) {
      [dirName, argContent] = name.slice(2).split(":");
    }
    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false
      },
      arg: argContent && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: camelize(argContent),
        isStatic: true
      }
    };
  }
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content
    }
  };
}
function parseAttributeValue(context) {
  const quote = context.source[0];
  advanceBy(context, 1);
  const endIndex = context.source.indexOf(quote);
  const content = parseTextData(context, endIndex);
  advanceBy(context, 1);
  return { content };
}
function parseTextData(context, endIndex) {
  const rawText = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return rawText;
}
function parseText(context) {
  const endTokens = ["<", context.options.delimiters[0]];
  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }
  const content = parestTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content
  };
}
function parestTextData(context, length) {
  const text = context.source.slice(0, length);
  advanceBy(context, length);
  return text;
}
function advanceBy(context, numberOfCharacters) {
  const { source } = context;
  context.source = source.slice(numberOfCharacters);
}
function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

// packages/compiler/src/codegen.ts
function generate(ast) {
  const returns = traverseNode(ast);
  const code = `
    return ${returns}
  `;
  return code;
}
function traverseNode(node) {
  switch (node.type) {
    case NodeTypes.ROOT:
      if (node.children.length === 1) {
        return traverseNode(node.children[0]);
      }
      const result = traverseChildren(node);
      return result;
    case NodeTypes.ELEMENT:
      return createElementVnode(node);
    case NodeTypes.INTERPOLATION:
      return createTextVNode(node.content);
    case NodeTypes.TEXT:
      return createTextVNode(node);
  }
}
function createTextVNode(node) {
  const child = createText(node);
  return `h(Text,null,${child})`;
}
function createText({ isStatic = true, content = "" }) {
  return isStatic ? JSON.stringify(content) : content;
}
function createElementVnode(node) {
  const tag = JSON.stringify(node.tag);
  const { children } = node;
  const propArr = createPropsArray(node);
  const propStr = propArr.length ? `{${propArr.join(",")}}` : "null";
  if (!children.length) {
    if (propStr == "null") {
      return `h(${tag})`;
    } else {
      return `h(${tag},${propStr})`;
    }
  }
  let childrenStr = traverseChildren(node);
  return `h(${tag},${propStr},${childrenStr})`;
}
function createPropsArray(node) {
  const { props, directives } = node;
  console.log();
  return [...directives.map((dir) => {
    switch (dir.name) {
      case "bind":
        return `${dir.arg.content}:${createText(dir.exp)}`;
      case "on":
        const eventName = `on${capitalize(dir.arg.content)}`;
        let exp = dir.exp.content;
        if (/\([^)]*?\)$/.test(exp) && !exp.includes("=>")) {
          exp = `$event=>(${exp})`;
        }
        return `${eventName}:${exp}`;
      case "html":
        console.log(`innerHTML:${createText(dir.exp)}`);
        return `innerHTML:${createText(dir.exp)}`;
      default:
        return `${dir.name}:${createText(dir.exp)}`;
    }
  }), ...props.map((prop) => `${prop.name}:${createText(prop.value)}`)];
}
function traverseChildren(node) {
  const { children } = node;
  if (children.length == 1) {
    const child = children[0];
    if (NodeTypes.TEXT === child.type) {
      return createText(child);
    }
    if (NodeTypes.INTERPOLATION === child.type) {
      return createText(child.content);
    }
  }
  const retults = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    retults.push(traverseNode(child));
  }
  return `[${retults.join(",")}]`;
}

// packages/compiler/src/compile.ts
function compile(template) {
  const ast = parse(template);
  return generate(ast);
}

// packages/compiler/src/index.ts
var HTML_TAGS = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot";
var VOID_TAGS = "area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr";
function makeMap(str) {
  const map = str.split(",").reduce((map2, item) => (map2[item] = true, map2), /* @__PURE__ */ Object.create(null));
  return (val) => !!map[val];
}
var isVoidTag = makeMap(VOID_TAGS);
var isNativeTag = makeMap(HTML_TAGS);

// packages/runtime-core/src/component.ts
function updateProps(instance, vnode) {
  var _a;
  const { type: Component, props: vnodeProps } = vnode;
  const props = instance.props = {};
  const attrs = instance.attrs = {};
  for (const key in vnodeProps) {
    if ((_a = Component.props) == null ? void 0 : _a.includes(key)) {
      props[key] = vnodeProps[key];
    } else {
      attrs[key] = vnodeProps[key];
    }
  }
  instance.props = reactive(instance.props);
}
function fallThrough(instance, subTree) {
  if (Object.keys(instance.attrs).length) {
    subTree.props = __spreadValues(__spreadValues({}, subTree.props), instance.attrs);
  }
}
function mountComponent(vnode, container, anchor, patch2) {
  var _a;
  const { type: Component } = vnode;
  const instance = vnode.component = {
    props: {},
    attrs: {},
    setupState: null,
    ctx: null,
    update: null,
    isMounted: false,
    subTree: null,
    next: null
  };
  updateProps(instance, vnode);
  instance.setupState = (_a = Component.setup) == null ? void 0 : _a.call(Component, instance.props, {
    attrs: instance.attrs
  });
  instance.ctx = __spreadValues(__spreadValues({}, instance.props), instance.setupState);
  if (!Component.render && Component.template) {
    const { template } = Component;
    const code = compile(template);
    Component.render = new Function("ctx", code);
    console.log(Component.render);
  }
  instance.update = effect(() => {
    if (!instance.isMounted) {
      const subTree = instance.subTree = normalizeVNode(Component.render(instance.ctx));
      fallThrough(instance, subTree);
      patch2(null, subTree, container, anchor);
      instance.isMounted = true;
      vnode.el = subTree.el;
    } else {
      if (instance.next) {
        vnode = instance.next;
        instance.next = null;
        updateProps(instance, vnode);
        instance.ctx = __spreadValues(__spreadValues({}, instance.props), instance.setupState);
      }
      const prev = instance.subTree;
      const subTree = instance.subTree = normalizeVNode(Component.render(instance.ctx));
      fallThrough(instance, subTree);
      patch2(prev, subTree, container, anchor);
      vnode.el = subTree.el;
    }
  }, {
    scheduler: queueJob
  });
}

// packages/runtime-core/src/render.ts
function render(vnode, container) {
  const prevVNode = container._vnode;
  if (!vnode) {
    if (prevVNode) {
      unmount(prevVNode);
    }
  } else {
    patch(prevVNode, vnode, container);
  }
  container._vnode = vnode;
}
function patch(n1, n2, container, anchor) {
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = (n1.anchor || n1.el).nextSibling;
    unmount(n1);
    n1 = null;
  }
  const { shapeFlag } = n2;
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(n1, n2, container, anchor);
  } else if (shapeFlag & ShapeFlags.TEXT) {
    processText(n1, n2, container, anchor);
  } else if (shapeFlag & ShapeFlags.FRAGMENT) {
    processFragment(n1, n2, container, anchor);
  } else if (shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(n1, n2, container, anchor);
  }
}
function mountElement(vnode, container, anchor) {
  const { type, props, shapeFlag, children } = vnode;
  const el = document.createElement(type);
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }
  if (props) {
    patchProps(el, null, props);
  }
  vnode.el = el;
  container.insertBefore(el, anchor);
}
function mountTextNode(vnode, container, anchor) {
  const textNode = document.createTextNode(vnode.children);
  vnode.el = textNode;
  container.insertBefore(textNode, anchor);
}
function mountChildren(children, container, anchor) {
  children.forEach((child) => {
    patch(null, child, container, anchor);
  });
}
function updateComponent(n1, n2) {
  n2.component = n1.component;
  n2.component.next = n2;
  n2.component.update();
}
function unmount(vnode) {
  const { shapeFlag, el } = vnode;
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(vnode);
  } else if (shapeFlag & ShapeFlags.FRAGMENT) {
    unmountFragment(vnode);
  } else {
    el.parentNode.removeChild(el);
  }
}
function unmountComponent(vnode) {
  const { component } = vnode;
  unmount(component.subTree);
}
function unmountFragment(vnode) {
  let { el: cur, anchor: end } = vnode;
  while (cur !== end) {
    const next = cur.nextSibling;
    cur.parentNode.removeChild(cur);
    cur = next;
  }
  end.parentNode.removeChild(end);
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type;
}
function processElement(n1, n2, container, anchor) {
  if (n1 == null) {
    mountElement(n2, container, anchor);
  } else {
    patchElement(n1, n2);
  }
}
function processFragment(n1, n2, container, anchor) {
  const fragmentStartAnchor = n2.el = n1 ? n1.el : document.createTextNode("");
  const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : document.createTextNode("");
  if (n1 == null) {
    container.insertBefore(fragmentStartAnchor, anchor);
    container.insertBefore(fragmentEndAnchor, anchor);
    mountChildren(n2.children, container, fragmentEndAnchor);
  } else {
    patchChildren(n1, n2, container, fragmentEndAnchor);
  }
}
function processText(n1, n2, container, anchor) {
  if (n1 == null) {
    mountTextNode(n2, container, anchor);
  } else {
    n2.el = n1.el;
    n2.el.textContent = n2.children;
  }
}
function processComponent(n1, n2, container, anchor) {
  if (n1 == null) {
    mountComponent(n2, container, anchor, patch);
  } else {
    updateComponent(n1, n2);
  }
}
function patchElement(n1, n2) {
  n2.el = n1.el;
  patchProps(n2.el, n1.props, n2.props);
  patchChildren(n1, n2, n2.el);
}
function patchChildren(n1, n2, container, anchor) {
  const { shapeFlag: prevShapeFlag, children: c1 } = n1;
  const { shapeFlag, children: c2 } = n2;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1);
    }
    if (c2 !== c1) {
      container.textContent = c2;
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (c1[0] && c1[0].key != null && c2[0] && c2[0].key != null) {
          patchKeyedChildren(c1, c2, container, anchor);
        } else {
          patchUnkeyedChildren(c1, c2, container, anchor);
        }
      } else {
        unmountChildren(c1);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = "";
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, container, anchor);
      }
    }
  }
}
function unmountChildren(children) {
  children.forEach((child) => unmount(child));
}
function patchUnkeyedChildren(c1, c2, container, anchor) {
  const oldLength = c1.length;
  const newLength = c2.length;
  const commonLength = Math.min(oldLength, newLength);
  for (let i = 0; i < commonLength; i++) {
    patch(c1[i], c2[i], container, anchor);
  }
  if (newLength > oldLength) {
    mountChildren(c2.slice(commonLength), container, anchor);
  } else if (newLength < oldLength) {
    unmountChildren(c1.slice(commonLength));
  }
}
function patchKeyedChildren(c1, c2, container, anchor) {
  let i = 0, e1 = c1.length - 1, e2 = c2.length - 1;
  while (i <= e1 && i <= e2 && c1[i].key === c2[i].key) {
    patch(c1[i], c2[i], container, anchor);
    i++;
  }
  while (i <= e1 && i <= e2 && c1[e1].key === c2[e2].key) {
    patch(c1[e1], c2[e2], container, anchor);
    e1--;
    e2--;
  }
  if (i > e1) {
    const nextPos = e2 + 1;
    const curAnchor = c2[nextPos] && c2[nextPos].el || anchor;
    for (let j = i; j <= e2; j++) {
      patch(null, c2[j], container, curAnchor);
    }
  } else if (i > e2) {
    for (let j = i; j <= e1; j++) {
      unmount(c1[j]);
    }
  } else {
    const map = /* @__PURE__ */ new Map();
    for (let j = i; j <= e1; j++) {
      const prev = c1[j];
      map.set(prev.key, { prev, j });
    }
    let maxNewIndexSoFar = 0;
    let move = false;
    const toMounted = [];
    const source = new Array(e2 - i + 1).fill(-1);
    for (let k = 0; k < e2 - i + 1; k++) {
      const next = c2[k + i];
      if (map.has(next.key)) {
        const { prev, j } = map.get(next.key);
        patch(prev, next, container, anchor);
        if (j < maxNewIndexSoFar) {
          move = true;
        } else {
          maxNewIndexSoFar = j;
        }
        source[k] = j;
        map.delete(next.key);
      } else {
        toMounted.push(k + i);
      }
    }
    map.forEach(({ prev }) => {
      unmount(prev);
    });
    if (move) {
      const seq = getSequence(source);
      let j = seq.length - 1;
      for (let k = source.length - 1; k >= 0; k--) {
        if (k === seq[j]) {
          j--;
        } else {
          const pos = k + i;
          const nextPos = pos + 1;
          const curAnchor = c2[nextPos] && c2[nextPos].el || anchor;
          if (source[k] === -1) {
            patch(null, c2[pos], container, curAnchor);
          } else {
            container.insertBefore(c2[pos].el, curAnchor);
          }
        }
      }
    } else if (toMounted.length) {
      for (let k = toMounted.length - 1; k >= 0; k--) {
        const pos = toMounted[k];
        const nextPos = pos + 1;
        const curAnchor = c2[nextPos] && c2[nextPos].el || anchor;
        patch(null, c2[pos], container, curAnchor);
      }
    }
  }
}
function getSequence(nums) {
  const result = [];
  const position = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === -1) {
      continue;
    }
    if (nums[i] > result[result.length - 1]) {
      result.push(nums[i]);
      position.push(result.length - 1);
    } else {
      let l = 0, r = result.length - 1;
      while (l <= r) {
        const mid = ~~((l + r) / 2);
        if (nums[i] > result[mid]) {
          l = mid + 1;
        } else if (nums[i] < result[mid]) {
          r = mid - 1;
        } else {
          l = mid;
          break;
        }
      }
      result[l] = nums[i];
      position.push(l);
    }
  }
  let cur = result.length - 1;
  for (let i = position.length - 1; i >= 0 && cur >= 0; i--) {
    if (position[i] === cur) {
      result[cur--] = i;
    }
  }
  return result;
}

// packages/runtime-core/src/createApp.ts
function createApp(rootComponent) {
  const app = {
    mount(rootContainer) {
      if (isString(rootContainer)) {
        rootContainer = document.querySelector(rootContainer);
      }
      render(h(rootComponent), rootContainer);
    }
  };
  return app;
}
function resolveComponent() {
}

// packages/runtime-core/src/helpers/renderList.js
function renderList(source, renderItem) {
  const vnodes = [];
  if (isNumber(source)) {
    for (let i = 0; i < source; i++) {
      vnodes.push(renderItem(i + 1, i));
    }
  } else if (isString(source) || isArray(source)) {
    for (let i = 0; i < source.length; i++) {
      vnodes.push(renderItem(source[i], i));
    }
  } else if (isObject(source)) {
    const keys = Object.keys(source);
    keys.forEach((key, index) => {
      vnodes.push(renderItem(source[key], key, index));
    });
  }
  return vnodes;
}

// packages/runtime-core/src/helpers/vModel.js
function withModel(tag, props, getter, setter) {
  props = props || {};
  if (tag === "input") {
    switch (props.type) {
      case "radio":
        props.checked = getter() === props.value;
        props.onChange = (e) => setter(e.target.value);
        break;
      case "checkbox":
        const modelValue = getter();
        if (isArray(modelValue)) {
          props.checked = modelValue.includes(props.value);
          props.onChange = (e) => {
            const { value } = e.target;
            const values = new Set(getter());
            if (values.has(value)) {
              values.delete(value);
            } else {
              values.add(value);
            }
            props.checked = values.has(props.value);
            setter([...values]);
          };
        } else {
          props.checked = modelValue;
          props.onChange = (e) => {
            props.checked = e.target.checked;
            setter(e.target.checked);
          };
        }
        break;
      default:
        props.value = getter();
        props.onInput = (e) => setter(e.target.value);
        break;
    }
  }
  return props;
}
export {
  Fragment,
  NodeTypes,
  Text,
  compile,
  computed,
  createApp,
  effect,
  h,
  isNativeTag,
  isReactive,
  isRef,
  isVoidTag,
  nextTick,
  parse,
  reactive,
  ref,
  render,
  renderList,
  resolveComponent,
  withModel
};
//# sourceMappingURL=vue.esm.js.map
