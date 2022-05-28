// packages/shared/src/index.js
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

// packages/reactivity/src/effect.js
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

// packages/reactivity/src/reactive.js
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

// packages/runtime-core/src/vnode.js
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

// packages/runtime-core/src/patchProps.js
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

// packages/runtime-core/src/scheduler.js
var queue = [];
var isFlushing = false;
var resolvedPromise = Promise.resolve();
var currentFlushPromise = null;
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
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
    currentFlushPromise = resolvedPromise.then(flushJobs);
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

// packages/runtime-core/src/component.js
function updateProps(instance, vnode) {
  const { type: Component, props: vnodeProps } = vnode;
  const props = instance.props = {};
  const attrs = instance.attrs = {};
  for (const key in vnodeProps) {
    if (Component.props?.includes(key)) {
      props[key] = vnodeProps[key];
    } else {
      attrs[key] = vnodeProps[key];
    }
  }
  instance.props = reactive(instance.props);
}
function fallThrough(instance, subTree) {
  if (Object.keys(instance.attrs).length) {
    subTree.props = {
      ...subTree.props,
      ...instance.attrs
    };
  }
}
function mountComponent(vnode, container, anchor, patch2) {
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
  instance.setupState = Component.setup?.(instance.props, {
    attrs: instance.attrs
  });
  instance.ctx = {
    ...instance.props,
    ...instance.setupState
  };
  instance.update = effect(() => {
    console.log(11);
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
        instance.ctx = {
          ...instance.props,
          ...instance.setupState
        };
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

// packages/runtime-core/src/render.js
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

// packages/runtime-core/src/createApp.js
var components;
function createApp(rootComponent) {
  components = rootComponent.components || {};
  const app = {
    mount(rootContainer) {
      if (typeof rootContainer === "string") {
        rootContainer = document.querySelector(rootContainer);
      }
      if (!isFunction(rootComponent.render) && !rootComponent.template) {
        rootComponent.template = rootContainer.innerHTML;
      }
      rootContainer.innerHTML = "";
      render(h(rootComponent), rootContainer);
    }
  };
  return app;
}
function resolveComponent(name) {
  return components && (components[name] || components[camelize(name)] || components[capitalize(camelize(name))]);
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
  Text,
  createApp,
  h,
  nextTick,
  render,
  renderList,
  resolveComponent,
  withModel
};
//# sourceMappingURL=runtime-core.esm.js.map
