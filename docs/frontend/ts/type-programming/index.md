---
outline: deep
---

# typescript 类型编程

## typescript 类型编程是什么

typescript 类型编程就是**对类型参数做各种逻辑运算，产生新的类型。** 可以简单的理解为 js 中的函数：

- 入参：泛型参数
- 函数体：逻辑运算
- 返回值：新类型

类型编程初体验：

```ts
type Obj = { name: string; age: number };
type ValueType = string | number;
```

看上面的例子，我们定义了一个类型 `Obj`，是一个索引类型。如果我们想要获取其值的类型，应该怎么做呢？

一方面可以像上面的例子一样，直接手动声明一个类型 `ValueType` 为 `string` 和 `number` 的联合类型。但如果有多个索引类型想要获取其值类型，每个都手动声明一个值类型就显得很麻烦。

像 js 一样，对于一些重复的逻辑我们可以封装为一个函数。对 ts 来说，我们可以通过类型编程来实现一个工具类型用于提取索引类型的值类型，这样我们就可以不用对每个索引类型都手动声明一个值类型了。可以通过下面的工具类型实现:

```ts twoslash
type Obj = { name: string; age: number };
type ValueType = string | number;

type GetObjectValue<T extends Record<string, any>> = T extends {
  [P in keyof T]: infer V;
}
  ? V
  : never;

type Res = GetObjectValue<Obj>;
```

把鼠标移到 `Res` 上面，就可以看到 `Res` 的类型为 `string | number`。

::: tip
本文的 ts 代码，可以通过鼠标悬停来查看其类型信息
:::

上面的 `GetObjectValue` 就是一个工具类型。通过 ts 类型编程的语法我们可以实现各种类型。其实 ts 类型编程是有一些固定的套路的，接下来我们一个个的学习

## typescript 类型编程常用语法

### 条件判断：`extends ? :`

可以类比为 js 中的三元表达式，如果一个类型兼容 `extends` 后的类型，那么结果为 `?` 后的类型，否则为 `:` 后的类型。看下面的例子：

```ts twoslash
type IsTrue<T> = T extends true ? 'true' : 'false';

type Res1 = IsTrue<true>;
type Res2 = IsTrue<false>;
```

### 推导：`infer`

用于提取类型，下面的例子是提取一个数组中第一个元素的类型

```ts twoslash
type GetFirst<T extends unknown[]> = T extends [infer First, ...infer Rest] ? First : never;
type Arr = ['1', '2', '3'];

type Res = GetFirst<Arr>;
```

### 类型映射

用于操作对象类型，主要是以下语法：

- 索引查询：`keyof T`
- 索引访问：`T[P]`
- 重映射：`as`

```ts twoslash
type Clone<T extends Record<string, any>> = {
  [P in keyof T]: T[P];
};
type Obj = { name: string; age: number };
type CloneObj = Clone<Obj>;

type GetNameType<T extends Record<string, any>> = {
  [P in keyof T as P extends 'name' ? P : never]: T[P];
};
type Res = GetNameType<Obj>;
type MapObj<T extends Record<string, any>> = {
  [P in keyof T as `#${P & string}`]: T[P];
};
type Res2 = MapObj<Obj>;
```

ts 的类型编程基本上就是上面介绍的语法的组合，接下来我们看一下 ts 类型编程中的具体套路

## 模式匹配做提取

通过 `extends` 一个模式类型，把需要提取的部分放到通过 `infer` 声明的局部变量中，后面就可以拿到这个局部变量的类型做各种处理，我们看几个例子

```ts twoslash
// 获取数组第一个元素
type GetArrFirst<Arr extends unknown[]> = Arr extends [infer First, ...infer Rest] ? First : never;
type Res1 = GetArrFirst<[1, 2, 3]>;

// 判断字符串是否以某个值开头
type StartsWith<Str extends string, V extends string> = Str extends `${V}${string}` ? true : false;
type Res2 = StartsWith<'hello world', 'hello'>;
type Res3 = StartsWith<'hello world', 'hihihi'>;

// 字符串替换
type Replace<
  Str extends string,
  From extends string,
  To extends string,
> = Str extends `${infer Prefix}${From}${infer Suffix}` ? `${Prefix}${To}${Suffix}` : Str;
type Res4 = Replace<'hello world', 'world', 'ts'>;

// 获取函数参数类型
type GetParamType<F extends Function> = F extends (...args: infer P) => any ? P : never;
type Res5 = GetParamType<(name: string, age: number) => void>;

// 获取函数返回值类型
type GetReturnType<F extends Function> = F extends (...args: any[]) => infer R ? R : never;
type Res6 = GetReturnType<() => string>;

// 获取 promise 的值的类型
type GetPromiseValue<T extends Promise<unknown>> = T extends Promise<infer V> ? V : never;
type Res7 = GetPromiseValue<Promise<'aaa'>>;

// 获取对象 name 属性的类型
type GetObjName<T> = T extends { name: infer V } ? V : never;
type Res8 = GetObjName<{ name: string }>;
```

## 重新构造做变换

和 `模式匹配做提取` 比较像，但 `重新构造做变换` 主要用于基于泛型参数构造出新的类型，`模式匹配做提取` 往往用于提取出泛型参数中的某一部分。下面我们看几个例子：

```ts twoslash
type Tuple1 = [1, 2];
type Tuple2 = ['a', 'b'];
type Res = [[1, 'a'], [2, 'b']];

// 将两个数组元素两两组合
type Zip<T1 extends unknown[], T2 extends unknown[]> = T1 extends [infer F1, ...infer Rest1]
  ? T2 extends [infer F2, ...infer Rest2]
    ? [[F1, F2], ...Zip<Rest1, Rest2>]
    : []
  : [];
type Res1 = Zip<Tuple1, Tuple2>;
type Res2 = Zip<['aaa', 'bbb', 'ccc'], [111, 222, 333]>;

type S = 'hello_ts_slidev';

// 将字符串转换为驼峰写法
type CamelCase<Str extends string> = Str extends `${infer Left}_${infer Right}${infer Rest}`
  ? `${Left}${Uppercase<Right>}${CamelCase<Rest>}`
  : Str;
type Res3 = CamelCase<S>;

// 给函数添加参数
type AppendArg<F extends Function, Arg> = F extends (...args: infer Args) => infer R
  ? (...args: [...Args, Arg]) => R
  : never;
type Res4 = AppendArg<(name: string) => void, number>;

// 将索引类型的键名改为大写
type UpKey<T extends Record<string, any>> = {
  [P in keyof T as Uppercase<P & string>]: T[P];
};
type Res5 = UpKey<{ name: string; age: number }>;

// 可选
type ToPartial<T> = {
  [P in keyof T]?: T[P];
};
// 必选
type ToRequired<T> = {
  [P in keyof T]-?: T[P];
};

// 按值类型过滤
type FilterByValueType<T extends Record<string, any>, V> = {
  [P in keyof T as T[P] extends V ? P : never]: T[P];
};
type Obj = { name: string; age: number; hobby: string[] };
type Res6 = FilterByValueType<Obj, string | number>;
```

## 递归复用做循环

typescript 类型系统不支持循环，但支持递归。当处理数量（个数、长度、层数）不固定的类型的时候，应考虑使用递归：

```ts twoslash
type P1 = Promise<Promise<Promise<Promise<{ code: number; data: any }>>>>;
type DeepPromiseValueType<T> = T extends Promise<infer V> ? DeepPromiseValueType<V> : T;
type Res1 = DeepPromiseValueType<P1>;

// 反转数组
type Arr = [1, 2, 3, 4, 5];
type ReverseArr<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? [...ReverseArr<Rest>, First]
  : [];
type Res2 = ReverseArr<Arr>; // [5, 4 ,3, 2, 1];

// 根据 Length 构建数组
type BuildArr<
  Length extends number,
  Ele = unknown,
  Arr extends unknown[] = [],
> = Arr['length'] extends Length ? Arr : BuildArr<Length, Ele, [...Arr, Ele]>;
type NewArr = BuildArr<5>;

type DeepReadonly<Obj extends Record<string, any>> = {
  readonly [Key in keyof Obj]: Obj[Key] extends Record<string, any>
    ? DeepReadonly<Obj[Key]>
    : Obj[Key];
};

interface Obj {
  name: string;
  age: number;
  friend: {
    name: string;
    foo: {
      a: number;
    };
  };
}
type Res3 = DeepReadonly<Obj>;
```

## 数组长度做计数

typescript类型系统中没有加减乘除运算符，想要做一些数值相关的计算可以通过**构造数组然后取length**来完成

```ts twoslash
type BuildArr<
  Length extends number,
  Ele = unknown,
  Arr extends unknown[] = [],
> = Arr['length'] extends Length ? Arr : BuildArr<Length, Ele, [...Arr, unknown]>;

// 加
type Add<N1 extends number, N2 extends number> = [...BuildArr<N1>, ...BuildArr<N2>]['length'];
type Res1 = Add<10, 5>;

// 减
type Sub<N1 extends number, N2 extends number> = [...BuildArr<N1>] extends [
  ...BuildArr<N2>,
  ...infer Rest,
]
  ? Rest['length']
  : never;
type Res2 = Sub<10, 5>;

// 乘
type Multiple<N1 extends number, N2 extends number, Res extends unknown[] = []> = N2 extends 0
  ? Res['length']
  : Multiple<N1, Sub<N2, 1>, [...Res, ...BuildArr<N1>]>;
type Res3 = Multiple<10, 5>;

// 除
type Divide<N1 extends number, N2 extends number, Res extends unknown[] = []> = N1 extends 0
  ? Res['length']
  : Divide<Sub<N1, N2>, N2, [...Res, unknown]>;
type Res4 = Divide<10, 5>;

function fibonacci(n: number) {
  let prev = 1;
  let cur = 1;
  for (let i = 2; i < n; i++) {
    let tmp = prev;
    prev = cur;
    cur = cur + tmp;
  }
  return cur;
}

// ts 实现斐波那契数列
type FiboLoop<
  PrevArr extends unknown[] = [],
  CurArr extends unknown[] = [],
  IndexArr extends unknown[] = [],
  Num extends number = 1,
> = IndexArr['length'] extends Num
  ? CurArr['length']
  : FiboLoop<CurArr, [...PrevArr, ...CurArr], [...IndexArr, unknown], Num>;

type Fibonacci<N extends number> = N extends 1
  ? 1
  : N extends 2
    ? 1
    : FiboLoop<[any], [any], [any, any], N>;
// 1, 1, 2, 3, 5, 8, 13, 21, 34
type Res5 = Fibonacci<9>;
```

## 联合分散可简化

当类型参数为联合类型并且条件类型左边直接引用该类型参数的时候，ts会把每个元素单独传入做运算，最后再合并成联合类型

```ts twoslash
type Exclude<T, U> = T extends U ? never : T;
type Res1 = Exclude<1 | 2 | 3 | 4, 1 | 2>;

type U = 'a' | 'b' | 'c';
type Res2 = `#${U}`;

type Camelcase<Str extends string> = Str extends `${infer Left}_${infer Right}${infer Rest}`
  ? `${Left}${Uppercase<Right>}${Camelcase<Rest>}`
  : Str;
type CamelCaseU = Camelcase<'hello_ts' | 'hello_js'>;

type TestUnion<U, V = U> = U extends U ? { a: U; b: V } : never;
type TestUnionRes = TestUnion<'a' | 'b'>;

type IsUnion<T, V = T> = T extends V ? ([V] extends [T] ? false : true) : never;
type Res3 = IsUnion<1 | 2 | 3>;
type Res4 = IsUnion<1>;
type Res5 = IsUnion<[1]>;

// 组合：'A' | 'B' => 'A' | 'B' | 'AB' | 'BA'
type Combination<A extends string, B extends string> = A | B | `${A}${B}` | `${B}${A}`;
type AllCombination<A extends string, B extends string = A> = A extends A
  ? Combination<A, AllCombination<Exclude<B, A>>>
  : never;
type Res6 = AllCombination<'A' | 'B' | 'C'>;
```

## 特殊特性要记清

- 1.IsAny: any 类型与任何类型的交叉都是 any

```ts twoslash
type IsAny<T> = 'a' extends 'b' & T ? true : false;
type Res1 = IsAny<any>;
type Res2 = IsAny<string>;
type Res3 = IsAny<{}>;
```

- 2.IsEqual

```ts twoslash
type IsEqual1<A, B> = (A extends B ? true : false) & (B extends A ? true : false);
type Res1 = IsEqual1<1, 1>;
type Res2 = IsEqual1<'a', 'b'>;
type Res3 = IsEqual1<'a', any>;

// 如果是两个条件类型 T1 extends U1 ? X1 : Y1 和 T2 extends U2 ? X2 : Y2 相关的话，那 T1 和 T2 相关、X1 和 X2 相关、Y1 和 Y2 相关，而 U1 和 U2 相等。
type IsEqual2<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Res4 = IsEqual2<1, 1>;
type Res5 = IsEqual2<'a', 'b'>;
type Res6 = IsEqual2<'a', any>;
```

- 3.IsNever: never 作为类型参数在条件类型左边时会直接返回 never

```ts twoslash
type TestNever<T> = T extends never ? true : false;
type T1 = TestNever<never>;
type T2 = TestNever<1>;

type IsNever<T> = [T] extends [never] ? true : false;
type Res1 = IsNever<1>;
type Res2 = IsNever<'a'>;
type Res3 = IsNever<never>;
```

- 4.IsTuple: 元组类型的 length 是数字字面量，而数组的 length 是 number。

```ts twoslash
type Len1 = [1, 2, 3]['length'];
type Len2 = number[]['length'];

type NotEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? false : true;

type IsTuple<T> = T extends [...eles: infer Eles] ? NotEqual<Eles['length'], number> : false;
type Res1 = IsTuple<[1, 2, 3]>;
type Res2 = IsTuple<string[]>;
type Res3 = IsTuple<'a'>;
```

- 5.UnionToIntersection: 联合类型转交叉类型

类型之间是有父子关系的，更具体的那个是子类型，比如 `A` 和 `B` 的交叉类型 `A & B` 就是联合类型 `A | B` 的子类型

如果允许父类型赋值给子类型，就叫做**逆变**

如果允许子类型赋值给父类型，就叫做**协变**

```ts twoslash
type UnionToIntersection<U> = (U extends U ? (x: U) => unknown : never) extends (
  x: infer R
) => unknown
  ? R
  : never;

type A = { name: string } | { age: number };
type Res = UnionToIntersection<A>;
```

- 6.GetOptional: 可选索引的值为 undefined 和值类型的联合类型

```ts twoslash
type Obj = { name: string; age?: number | undefined };

type GetOptional<T extends Record<string, any>> = {
  [P in keyof T as {} extends Pick<T, P> ? P : never]: T[P];
};
type Res = GetOptional<Obj>;
```

- 7.as const: 默认推导出来的不是字面量类型，加上 as const 可以推导出字面量类型，但带有 readonly 修饰

```ts twoslash
const Person1 = { name: '张三', age: 20 };
const Person2 = { name: '张三', age: 20 } as const;
```

- 8.infer extends

```ts twoslash
type TestString<T extends string[]> = T extends [infer First, ...infer Rest]
  ? `第一个元素是${First}`
  : never;
type Res = TestString<['a', 'b', 'c']>;

type TestString2<T extends string[]> = T extends [infer First, ...infer Rest]
  ? First extends string
    ? `第一个元素是${First}`
    : never
  : never;
type Res2 = TestString2<['a', 'b', 'c']>;

type TestString3<T extends string[]> = T extends [infer First extends string, ...infer Rest]
  ? `第一个元素是${First}`
  : never;

enum E {
  a = 1,
  b = 2,
  c = 'aaa',
  d = 'bbb',
}
type EValue = `${E}`;

type StringToNumber<S> = S extends `${infer V extends number}` ? V : S;
type EValue2 = StringToNumber<`${E}`>;
```

## 学习文档：

- [官方文档：https://www.typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html)

- [type-challenges: https://github.com/type-challenges/type-challenges](https://github.com/type-challenges/type-challenges)

- [TypeScript 类型体操通关秘籍: https://juejin.cn/book/7047524421182947366](https://juejin.cn/book/7047524421182947366)

- [深入理解 TypeScript: https://jkchao.github.io/typescript-book-chinese](https://jkchao.github.io/typescript-book-chinese/)
