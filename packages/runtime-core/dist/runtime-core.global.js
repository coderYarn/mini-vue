var vueRuntimeCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/runtime-core/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    Fragment: () => Fragment,
    Text: () => Text,
    h: () => h,
    render: () => render
  });

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
  function hasChanged(value, oldValue) {
    return value !== oldValue && (value === value || oldValue === oldValue);
  }

  // packages/runtime-core/src/vnode.ts
  var Text = Symbol("text");
  var Fragment = Symbol("fragment");
  var ShapeFlags = {
    ELEMENT: 1,
    TEXT: 1 << 1,
    FRAGMENT: 1 << 2,
    STATEFUL_COMPONENT: 1 << 3,
    FUNCTIONAL_COMPONENT: 1 << 4,
    COMPONENT: 1 << 3 | 1 << 4,
    TEXT_CHILDREN: 1 << 5,
    ARRAY_CHILDREN: 1 << 6,
    CHILDREN: 1 << 5 | 1 << 6
  };
  function h(type, props = null, children = null) {
    let shapeFlag = 0;
    if (typeof type === "string") {
      shapeFlag = ShapeFlags.ELEMENT;
    } else if (type === Text) {
      shapeFlag = ShapeFlags.TEXT;
    } else if (type === Fragment) {
      shapeFlag = ShapeFlags.FRAGMENT;
    } else if (isFunction(type)) {
      shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
    } else {
      shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
    }
    if (typeof children === "string" || typeof children === "number") {
      shapeFlag |= ShapeFlags.TEXT_CHILDREN;
      children = children.toString();
    } else if (Array.isArray(children)) {
      shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }
    return {
      type,
      props,
      children,
      shapeFlag,
      el: null,
      anchor: null,
      key: props && props.key
    };
  }
  function normalizeVNode(result) {
    if (isArray(result)) {
      return h(Fragment, null, result);
    }
    if (isObject(result)) {
      return result;
    }
    return h(Text, null, result.toString());
  }

  // packages/reactivity/src/effect.ts
  var activeEffect;
  var targetMap = /* @__PURE__ */ new WeakMap();
  function track(target, key) {
    if (!activeEffect) {
      return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, deps = /* @__PURE__ */ new Set());
    }
    deps.add(activeEffect);
  }
  function trigger(target, key, newValue, oldValue) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      return;
    }
    let deps = depsMap.get(key);
    if (!deps) {
      return;
    }
    deps.forEach((effect2) => {
      if (effect2.scheduler) {
        effect2.scheduler(effect2);
      } else {
        effect2();
      }
    });
  }

  // packages/reactivity/src/reactive.ts
  var proxyMap = /* @__PURE__ */ new WeakMap();
  function reactive(target) {
    if (!isObject(target)) {
      return;
    }
    if (isReactive(target)) {
      return target;
    }
    if (proxyMap.has(target)) {
      return proxyMap.get(target);
    }
    const proxy = new Proxy(target, {
      get(target2, key, receiver) {
        if (key === "__isReactive") {
          return true;
        }
        const result = Reflect.get(target2, key, receiver);
        track(target2, key);
        return isObject(result) ? reactive(result) : result;
      },
      set(target2, key, value, receiver) {
        let oldLength;
        if (isArray(target2)) {
          oldLength = target2.length;
        }
        const oldVal = target2[key];
        const result = Reflect.set(target2, key, value, receiver);
        if (hasChanged(oldVal, value)) {
          trigger(target2, key, value, oldVal);
          if (oldLength == target2.length) {
            trigger(target2, "length");
          }
        }
        return result;
      }
    });
    proxyMap.set(target, proxy);
    return proxy;
  }
  function isReactive(targer) {
    return !!(targer && targer.__isReactive);
  }

  // packages/runtime-core/src/component.ts
  function initProps(instance, vnode) {
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
  function mountComponent(vnode, container, anchor, patch2) {
    var _a;
    const { type: Component } = vnode;
    const instance = {
      props: null,
      attrs: null,
      setupState: null,
      ctx: null,
      mount: null
    };
    initProps(instance, vnode);
    instance.setupState = (_a = Component.setup) == null ? void 0 : _a.call(Component, instance.props, { attrs: instance.attrs });
    instance.ctx = __spreadValues(__spreadValues({}, instance.props), instance.setupState);
    instance.mount = () => {
      const subTree = normalizeVNode(Component.render(instance.ctx));
      if (Object.keys(instance.attrs).length) {
        subTree.props = __spreadValues(__spreadValues({}, subTree.props), instance.attrs);
      }
      patch2(null, subTree, container, anchor);
    };
    instance.mount();
  }

  // packages/runtime-core/src/patchProps.ts
  var domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
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
      const next = newProps[key];
      const prev = oldProps[key];
      if (prev !== next) {
        patchDomProp(prev, next, key, el);
      }
      for (const key2 in oldProps) {
        if (key2 !== "key" && newProps[key2] == null) {
          patchDomProp(oldProps[key2], null, key2, el);
        }
      }
    }
  }
  function patchDomProp(prev, next, key, el) {
    switch (key) {
      case "class":
        el.className = next || "";
        break;
      case "style":
        if (next == null) {
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
          const eventName = key.slice(2).toLowerCase();
          if (prev) {
            el.removeEventListener(eventName, prev);
          }
          if (next) {
            el.addEventListener(eventName, next);
          }
        } else if (domPropsRE.test(key)) {
          if (next === "" && typeof el[key] === "boolean") {
            next = true;
          }
          el[key] = next;
        } else {
          if (next == null || next === false) {
            el.removeAttribute(key);
          }
          {
            el.setAttribute(key, next);
          }
        }
    }
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
    if (n1 && !isSameVNode(n1, n2)) {
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
  function patchElement(n1, n2) {
    n2.el = n1.el;
    patchProps(n1.props, n2.props, n2.el);
    patchChildren(n1, n2, n2.el);
  }
  function patchChildren(n1, n2, container, anchor) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        container.textContent = c2.textContent;
      }
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = "";
        mountChildren(c2, container, anchor);
      } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (c1[0] && c1[0].key !== null && c2[0] && c2[0].key !== null) {
          patchKeyChildren(c1, c2, container, anchor);
        } else {
          patchUnKeyChildren(c1, c2, container, anchor);
        }
      } else {
        mountChildren(c2, container, anchor);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = "";
      }
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
    }
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
  function unmountChildren(children) {
    children.forEach((child) => {
      unmount(child);
    });
  }
  function processText(n1, n2, container, anchor) {
    if (n1) {
      n2.el = n1.el;
      n2.el.textContent = n2.children;
    } else {
      mountTextNode(n2, container, anchor);
    }
  }
  function processFragment(n1, n2, container, anchor) {
    const fragmentStartAnchor = n2.el = n1 ? n1.el : document.createTextNode("");
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : document.createTextNode("");
    if (n1) {
      patchChildren(n1, n2, container, fragmentEndAnchor);
    } else {
      container.insertBefore(fragmentStartAnchor, anchor);
      container.insertBefore(fragmentEndAnchor, anchor);
      mountChildren(n2.children, container, fragmentEndAnchor);
    }
  }
  function processComponent(n1, n2, container, anchor) {
    if (n1) {
    } else {
      mountComponent(n2, container, anchor, patch);
    }
  }
  function processElement(n1, n2, container, anchor) {
    if (n1) {
      patchElement(n1, n2);
    } else {
      mountElement(n2, container, anchor);
    }
  }
  function unmountComponent(vnode) {
  }
  function unmountFragment(vnode) {
    let { el: cur, anchor: end } = vnode;
    const { parentNode } = cur;
    while (cur !== end) {
      const next = cur.nextSibling;
      cur.parentNode.removeChild(cur);
      cur = next;
    }
    parentNode.removeChild(end);
  }
  function isSameVNode(n1, n2) {
    return n1.type === n2.type;
  }
  function mountTextNode(vnode, container, anchor) {
    const textNode = document.createTextNode(vnode.children);
    container.insertBefore(textNode, anchor);
    vnode.el = textNode;
  }
  function mountElement(vnode, container, anchor) {
    const { type, props, shapeFlag, children } = vnode;
    const el = document.createElement(type);
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, null);
    }
    if (props) {
      patchProps(el, null, props);
    }
    vnode.el = el;
    container.insertBefore(el, anchor);
  }
  function mountChildren(children, container, anchor) {
    children.forEach((child) => {
      patch(null, child, container, anchor);
    });
  }
  function patchUnKeyChildren(c1, c2, container, anthor) {
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    for (let i = 0; i < commonLength; i++) {
      patch(c1[i], c2[i], container, anthor);
    }
    if (oldLength > newLength) {
      unmountChildren(c1.slice(commonLength));
    } else if (oldLength < newLength) {
      mountChildren(c2.slice(commonLength), container, anthor);
    }
  }
  function patchKeyChildren(c1, c2, container, anthor) {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while (i <= e1 && i <= e2 && c1[i].key === c2[i].key) {
      patch(c1[i], c2[i], container, anthor);
      i++;
    }
    while (i <= e1 && i <= e2 && c1[e1].key === c2[e2].key) {
      patch(c1[e1], c2[e2], container, anthor);
      e1--;
      e2--;
    }
    if (i > e1) {
      for (let j = i; j <= e2; j++) {
        const curAnchor = c2[e2 + 1] && c2[e2 + 1].el || anthor;
        patch(null, c2[j], container, curAnchor);
      }
    } else if (i > e2) {
      for (let j = i; j < e1; j++) {
        unmount(c1[j]);
      }
    } else {
      const map = /* @__PURE__ */ new Map();
      for (let j = i; j <= e1; j++) {
        const prev = c1[j];
        map.set(prev.key, prev);
      }
      let maxNewIndexSoFar = 0;
      let source = new Array(e2 - i + 1).fill(-1);
      let move = false;
      const toMounted = [];
      for (let k = 0; k < c2.length; k++) {
        const next = c2[k];
        if (map.has(next.key)) {
          const { prev, j } = map.get(next.key);
          patch(prev, next, container, anthor);
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
          if (seq[j] === k) {
            j--;
          } else {
            const pos = k + i;
            const nextPos = pos + 1;
            const curAnchor = c2[nextPos] && c2[nextPos].el || anthor;
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
          const curAnchor = c2[nextPos] && c2[nextPos].el || anthor;
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
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=runtime-core.global.js.map
