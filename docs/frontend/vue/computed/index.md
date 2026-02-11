---
outline: deep
---

# computed 和 watch 实现原理

上一篇文章中我们介绍了 vue 的响应式系统及其实现原理，本文我们来看一下 `computed` 和 `watch` 的实现原理

## computed

### 基本实现

先看一下 computed 的用法：

```vue
<script setup>
import { ref, computed } from 'vue';

const firstName = ref('hello');
const lastName = ref('vue');

const fullName1 = computed(() => `${firstName.value} ${lastName.value}`);
console.log(fullName1.value);
</script>
```

可以看到，computed 返回的是一个对象，需要通过其 `value` 属性才能够获取到值，在上一篇中介绍[懒执行的 effect](/frontend/vue/reactivity/#懒执行的-effect)说到，通过懒执行的 effect 可以实现 computed

:::code-group

```js [computed.js]
import { effect } from './effect.js';

function computed(getter) {
  const effectFn = effect(getter, { lazy: true });

  const wrapper = {
    get value() {
      // 访问 .value 时才执行副作用函数
      return effectFn();
    },
  };

  return wrapper;
}
```

```js [effect.js]
export function effect(fn, options = {}) {
  const effectFn = () => {
    try {
      cleanup(effectFn);
      effectStack.push(effectFn);
      activeEffect = effectFn;
      return fn(); // 返回 fn 的执行结果
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
    }
  };
  effectFn.deps = [];
  effectFn.options = options;
  // options 可以传入 lazy 属性，不是懒执行时则立即执行 effectFn
  if (!options.lazy) {
    effectFn();
  }
  return effectFn; // 返回 effectFn，让调用方决定何时执行
}
```

:::

### 添加缓存特性

这样一个简单的 computed 就实现。目前只有在读取 `value` 属性时才会求值，但 computed 除了懒计算的特性之外，还能对值进行缓存，也就是 computed 依赖的响应式数据不变的情况下，多次访问 `.value` 得到的是同一个值，并且只会执行一次副作用。所以接下来我们要添加缓存的功能：

```js
function computed(getter) {
  // 用于缓存上一次的值
  let _value;
  // 标识是否需要重新计算。初始值为 true，也就是首次读取 computed.value 时要执行一次副作用函数
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      // 当依赖的响应式数据发送变化时，需要将 dirty 设置为 true，这样下次读取 computed.value 才能重新计算获取正确的值
      dirty = true;
    },
  });

  const wrapper = {
    get value() {
      if (dirty) {
        _value = effectFn();
        // 设置为 false，这样后续在依赖的响应式数据不变的情况下就不需要再执行副作用函数，之间返回 _value 即可
        dirty = false;
      }
      return _value;
    },
  };

  return wrapper;
}
```

### 解决 effect 嵌套依赖问题

这样我们就为 computed 添加了缓存的特性，但还有一个缺陷，就是我们在组件模板中使用 `computed` 时，由于组件模板会被编译为 `render` 函数并且在 `effect` 中执行，这样就会有一个问题：当 `computed` 依赖的响应式数据变化时，页面不会更新（组件模板没有引用 computed 依赖的响应式数据），我们用以下代码模拟

```js
const state = reactive({ foo: 1, bar: 2 });
const sum = computed(() => state.foo + state.bar);

effect(() => {
  console.log(sum.value);
});
```

我们期望当 `state` 变化时，`effect` 中的副作用函数重新执行，但 `state` 收集的副作用函数是 computed 内部的 `effect`，并不是外层的 `effect`，所以外层的 `effect` 并不会重新执行。本质上是 effect 嵌套导致的问题。解决的思路也很简单，就是在 `computed` 内部的 `effect` 重新执行时，手动触发外层的 `effect` 执行

```js{10,21}
function computed(getter) {
  let _value;
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true;
      // computed 依赖的响应式数据变化时，手动触发 computed 关联的副作用函数重新执行
      trigger(wrapper, 'value');
    },
  });

  const wrapper = {
    get value() {
      if (dirty) {
        _value = effectFn();
        dirty = false;
      }
      // 收集使用了 computed 的副作用函数
      track(wrapper, 'value');
      return _value;
    },
  };

  return wrapper;
}
```

### 可写的 computed

上面我们实现的 `computed` 的 `value` 属性是只读的，但实际使用中，`computed` 除了接收一个 `getter` 函数外，还可以接收一个拥有 `getter` 和 `setter` 的对象。看下面的例子

```js
const firstName = ref('John');
const lastName = ref('Doe');

const fullName = computed({
  get() {
    return firstName.value + ' ' + lastName.value;
  },
  set(newValue) {
    [firstName.value, lastName.value] = newValue.split(' ');
  },
});
```

接下来我们实现可写的 computed

```js
const isFunction = val => typeof val === 'function';

function computed(getterOrOptions) {
  let getter;
  let setter;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {};
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  let _value;
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true;
      trigger(wrapper, 'value');
    },
  });

  const wrapper = {
    get value() {
      if (dirty) {
        _value = effectFn();
        dirty = false;
      }
      track(wrapper, 'value');
      return _value;
    },
    set value() {
      setter();
    }
  };

  return wrapper;
}
```

实现也很简单，就是多了一个参数标准化的过程。

## watch

### 简单实现

`watch` 就是观察一个响应式数据，当响应式数据变化时通知并执行传入的回调函数：

```js
const state = reactive({ foo: 1 });

watch(state, () => {
  console.log('state changed');
});

state.foo++; // watch 的回调函数会重新执行
```

观察 `watch` 的用法我们可以发现和 `effect` 很像。也都是当响应式数据变化时，执行一个函数。实际上，`watch` 内部也是依赖 `effect` 执行的。下面我们就实现一个简单的 `watch`

```js
const isFunction = val => typeof val === 'function';

function watch(source, cb) {
  let getter;
  // source 除了是响应式对象也可以是 getter 函数
  if (isFunction(source)) {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  effect(getter, {
    scheduler() {
      cb();
    },
  });
}

// 深度遍历对象
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const key in value) {
    traverse(value[key], seen);
  }
  return value;
}
```

可以看到，在 `watch` 内部的 `effect` 中调用 `traverse` 进行递归地读取操作，然后通过 `scheduler` 配置项，在响应式数据变化时执行 `cb` 函数。

除了执行回调函数之外，我们在 vue 中使用 `watch` 函数时，还能够在回调函数中得到变化前后的值：

```js
const state = reactive({ foo: 1 });

watch(
  () => state.foo,
  (newValue, oldValue) => {
    console.log(newValue, oldValue);
  }
);
```

要实现这个功能，需要利用 `effect` 函数的 lazy 选项：

```js
function watch(source, cb) {
  let getter;
  // source 除了是响应式对象也可以是 getter 函数
  if (isFunction(source)) {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue, newValue;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      newValue = effectFn();
      cb(newValue, oldValue);
      oldValue = newValue;
    },
  });

  oldValue = effectFn();
}
```

### 立即执行的 watch 与回调函数的执行时机

上面的实现中，`watch` 的回调函数只会在响应式数据变化时执行，但在 vue 中可以通过选项参数 `immediate` 来指定回调是否需要立即执行，接下来我们实现立即执行的 `watch`

```js
function watch(source, cb, options = {}) {
  let getter;
  // source 除了是响应式对象也可以是 getter 函数
  if (isFunction(source)) {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue, newValue;

  const job = () => {
    newValue = effectFn();
    cb(newValue, oldValue);
    oldValue = newValue;
  };

  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job,
  });

  if (options.immediate) {
    job();
  } else {
    oldValue = effectFn();
  }
}
```

我们实现的 `watch` 回调函数目前默认是同步执行的，实际上 `watch` 的选项参数 `options` 还可以接受 `flush` 属性，用来指定回调函数的执行时机。有三个值：`'pre'`，`'sync'`，`'post'` 其中默认值是 `pre`，可以简单理解为在一个微任务中执行，`sync` 就是立即执行，和我们目前的实现一样，`post` 也是在一个微任务中执行，只不过设置为 `post` 时，我们可以在回调函数中获取到更新后的DOM。

这是和 vue 的调度系统相关的，简单来说就是 vue 内部维护了两个任务队列：正常队列和 post队列，这两个队列都是在微任务中执行的，而正常队列又分为 `pre` 和 `normal`。vue 更新时会在一个微任务中先执行 pre 的任务，然后执行正常任务（更新DOM就在这里面）。最后执行 post 队列中的任务。`watch` 的 `flush` 选项中的 `pre` 和 `post` 就在对应阶段中执行，所以 `post` 是能够获取到更新后的DOM 的。由于涉及到调度系统，这里我们就不实现watch 的回调函数执行时机了。理解其原理即可。

### 过期的副作用

过期的副作用和竞态问题有关，关于竞态问题，可以查看这篇博客：[竞态问题](/frontend/js/race-condition/)

举个例子：

```js
let finalData;

watch(tab, async () => {
  const res = await fetch('/api/data');
  finalData = res;
});
```

当 tab 多次切换时，会发起多次请求，finalData 的值会是最后返回的请求的数据，但最后返回的并不一定是最后发起的请求，这里就可能会出现问题了。

解决方案就是忽略不是最后一次的请求结果，在 vue 中，`watch` 回调函数接受第三个参数 `onCleanup`，我们可以使用 `onCleanup` 注册一个回调，这个回调函数会在当前副作用函数过期时执行：

```js
let finalData;

watch(tab, async (newValue, oldValue, onCleanup) => {
  // 标识当前副作用是否过期
  let expired = false;
  // 当tab变化时，再次执行回调函数之前，会执行 onCleanup 中注册的回调
  onCleanup(() => {
    expired = true;
  });
  const res = await fetch('/api/data');

  // 只有最新的回调 expired 是没过期的，这样就能保证 finalData 是最后一次请求返回的数据
  if (!expired) {
    finalData = res;
  }
});
```

接下来我们实现 onCleanup:

```js
function watch(source, cb, options = {}) {
  let getter;
  if (isFunction(source)) {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue, newValue;

  let cleanup;
  const onCleanup = fn => {
    cleanup = fn;
  };

  const job = () => {
    newValue = effectFn();
    // 在调用回调函数 cb 之前，先调用过期回调
    cleanup?.();
    cb(newValue, oldValue);
    oldValue = newValue;
  };

  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job,
  });

  if (options.immediate) {
    job();
  } else {
    oldValue = effectFn();
  }
}
```
