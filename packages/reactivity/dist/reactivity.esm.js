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
function hasChanged(value, oldValue) {
  return value !== oldValue && (value === value || oldValue === oldValue);
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
export {
  computed,
  effect,
  isReactive,
  isRef,
  reactive,
  ref
};
//# sourceMappingURL=reactivity.esm.js.map
