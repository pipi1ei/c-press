---
outline: deep
---

# 前端开发中的竞态问题

[竞态问题 Race Condition](https://en.wikipedia.org/wiki/Race_condition) 通常用来指代一个系统或进程的输出依赖于不受控制的事件完成顺序。

这个问题在多进程或者多线程编程中经常被提及。

举例来说，如果计算机中两个进程同时试图修改一个共享内存的内容，在没有并发控制的情况下，最后的结果依赖于两个进程的执行顺序与时机。而且如果发送了并发访问冲突，则最后的结果很可能是不正确的。

多进程/多线程的情况下，问题会复杂很多，甚至可能会出现由此引发的死锁的问题，相对而言，这个问题前端工程师可能很少讨论，因为 js 是单线程的，js 的**执行本身**也总是同步的。

但是需要注意的是，js 虽然是单线程的，可是浏览器是多进程的。实际上，当**异步**这个概念引入 js 之后，竞态问题理论上就已经遍布前端开发工作的日常中了。

## 常见的竞态问题

首先需要明确的是，竞态问题不能与节流混为一谈。竞态是建立在**操作必然需要发生**的基础上的。

比如用户发送了某个请求，当他通过操作要求再次请求的时候，不能因为上次的请求仍在进行中，就拒绝用户的操作。

很常见的一个场景就是某个业务要求用户在点击 tab 后刷新数据，那就不能使用我们平时避免重复请求所用的 `requestLock` 操作。

```javascript{3,5,6,11}
// requestLock 在此场景下不适用
let data = '';
let requestLock = false;
const somReq = async () => {
  if (requestLock) return;
  requestLock = true;
  try {
    const res = await fetch('api');
    data = res;
  } finally {
    requestLock = false;
  }
};

someReq();
someReq();
```

我们用如下最简单的代码模拟 tab 切换的场景

```javascript
let data = '';
const someReq = async () => {
  data = await fetch('api');
};

someReq();
someReq();
```

以上代码中，`someReq` 连续执行了两次，每次都对 `data` 赋值为当前接口返回的最新数据。这段代码乍一看没什么问题，但如果将代码改成下面这样，就会很容易发现这段代码实际上是有严重的 bug 的。

```javascript
let data = '';
const requestA = async () => {
  data = await fetch('api/a');
};
const requestB = async () => {
  data = await fetch('api/b');
};

requestA();
requestB();
```

如上代码，`data` 最终的值是接口 A 返回的，还是接口 B 返回的呢？

触发点击事件的频率和先后不是由我们控制的，而在进入两个 `fetch` 方法之后的执行顺序也不受我们控制的。

也就是说，尽管我们预期的结果是每次都能够展示当前点击后的内容，但实际上结果是不正确的。

```
点击tab1 ---> 发送请求A（假设要花费100ms）
点击tab1 ---> 发送请求B（假设要花费50ms）
请求B返回 ---> 将B的结果赋值给data
请求A返回 ---> 将A的结果赋值给data
```

可以看到，我们先点击了 tab1，然后又点击了 tab2，我们期望展示的数据是 tab2 的数据，实际上却展示了 tab1 的数据。

这种问题不仅仅出现在网络请求中，也会出现在任何需要委托浏览器进行，随后由浏览器安排进任务队列的情况中。比如用 `setTimeout` 模拟网络请求也会出现这种问题。

通过对以上问题的简单分析，不难得出竞态问题出现的两个必要条件：

- 有共享域
- 不同主体对数据进行了某一操作，或者相同主体进行了异步的操作

对于前端开发来说，第二点基本上可以简化为所有的异步操作。换言之，有异步的地方，就会有竞态问题。

## 竞态问题的解决方案

知道了竞态问题出现的前提，那么解决思路也就很简单。针对“共享域”和“不同主体”提出解决思路即可。

首要我们需要排除的是对“不同主体”的解决方案，在前端开发中，这个解决方案显然可以与取消异步划等号。将所有操作变为同步的，阻塞请求，不给浏览器“插队”操作数据的机会，主动排到最后，这样就保证了主体的一致性，先进先出的执行操作是绝对不会出现竞态问题的。

举例来说，就是上锁，禁止在异步操作的时候进行同一数据的交互。

```javascript
let data = '';
let requestLock = false;
const somReq = async () => {
  if (requestLock) return;
  requestLock = true;
  try {
    const res = await fetch('api');
    data = res;
  } finally {
    requestLock = false;
  }
};
```

这种上锁的方式一般是用来防止多次请求的。假设有多个 tab 页共享这个请求，也就是说当点击 tab 的时候，如果某接口还在请求中，那么就不允许切换。

这样显然与前端开发的基本原则相违背，用户体验也会大打折扣。因此最佳实践就是从“共享域”这个角度出发解决问题。

### 数据分离

第一个解决方案就是数据分离。这个是最容易消灭的，也从根本上消灭了共享域。竞态问题也就迎刃而解了。

数据分离往往应用在组件化开发上，是组件化经常用到的一个思想，或是说是组件化的一个天然优势。数据和交互被内聚在组件内部，组件外部在负责组件切换的时候，并不会因为组件内部数据的变化而产生混乱。

```vue
<script setup>
import { ref, computed } from 'vue';
import CompA from './CompA';
import CompB from './CompB';

const flag = ref(true);
const triggerRace = () => {
  flag.value = !flag.value;
};
const comp = computed(() => (flag ? CompA : CompB));
</script>

<template>
  <component :is="comp" />
</template>
```

### 验证标识

第二个解决方案，也是最常见最广泛使用的，就是加一个“验证标识”，只有在通过验证的时候，步骤才会被执行。这个方案虽然操作了同一数据域，但因为加上了验证标识，保证数据域获取到的是最新的数据，因而也可以避免竞态问题。

实践上 vue3 也是通过这个原理实现的。在 vue 中，`watch` 函数接收第三个参数 `onCleanup`，这个回调会在 `effect` 副作用函数执行之前执行。用于对数据进行验证操作，下面这段代码展示了使用 vue3 开发是如何解决问题的

```javascript
import { ref, watch } from 'vue';

const data = ref(null);
const currentTab = ref('tab1');

watch(currentTab, async (newV, oldV, onCleanup) => {
  let expired = false;
  onCleanup(() => (expired = true));
  const res = await fetch(`api/${currentTab}`);
  if (!expired) {
    data.value = res;
  }
});
```

如上代码所示，在发送请求之前定义了一个 `expired` 变量，用来标识当前的 `watch` 的副作用函数是否过期，接着在 `onCleanup` 中注册了一个过期回调，如果在当前请求发出后，又有同一个 `watch` 副作用函数被触发，则会将上一个副作用的 `expired` 置为 true，上一个副作用的请求结果返回后，就不会进行赋值，保证了 `data` 的值始终是最新的请求结果。

vue `watch` 函数的基本实现如下：

```javascript{10-13,16}
function watch(source, cb, options = {}) {
  let getter;
  if (typeof source === 'function') {
    getter = source;
  } else if (isObject(source)) {
    getter = traverse(source); // 递归遍历对象，从而在副作用函数中收集所有依赖
  }

  let oldV, newV;
  let cleanup;
  function onCleanup(fn) {
    cleanup = fn;
  }
  const job = () => {
    newV = effectFn();
    cleanup?.();
    cb(oldV, newV, onCleanup);
    oldV = newV;
  };
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      queueJob(job); // 异步执行回调
    },
  });
  if (options.immediate) {
    job();
  } else {
    oldV = effectFn();
  }
}
```

那么假设 `watch` 副作用触发了两次，其实际产生的效果应该如下：

```
点击 tab1
=> expiredA = false
=> cleanup(() => expiredA = true)
=> 发送请求A

点击 tab2
=> cleanupA() => expiredA = true
=> expiredB = false
=> cleanup(() => expiredB = true)
=> 发送请求B

请求B返回 ---> 将结果赋值给data
请求A返回 ---> expiredA === true ----> 无操作
```

### 取消操作

第三个解决方案，就是直接取消原先的操作，避免其产生副作用

我们以跟随 `fetch` api 一起引入的 [AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController/abort) api 为例

> 当 fetch 请求 初始化时，我们将 AbortSignal 作为一个选项传递进入请求的选项对象中（下面的 {signal}）。这将 signal 和 controller 与 fetch 请求相关联，并且允许我们通过调用 AbortController.abort() 去中止它，如下面的第二个事件监听器

```javascript
var controller = new AbortController();
var signal = controller.signal;

var downloadBtn = document.querySelector('.download');
var abortBtn = document.querySelector('.abort');

downloadBtn.addEventListener('click', fetchVideo);

abortBtn.addEventListener('click', function () {
  controller.abort();
  console.log('Download aborted');
});

function fetchVideo() {
  // …
  fetch(url, { signal })
    .then(function (response) {
      // …
    })
    .catch(function (e) {
      reports.textContent = `Download error: ${e.message}`;
    });
}
```

## 简单的竞态问题案例

考虑如下 demo。通常情况下，我们想要的效果是，点击哪个按钮，下方文字即显示当前 tab 对应的文字。

实际上，当我们在不稳定请求的情况下，**频繁**连续切换按钮，很可能会造成展示内容的错乱。

<script setup>import RaceConditionDemo from './examples/RaceConditionDemo.vue'</script>
<RaceConditionDemo />
