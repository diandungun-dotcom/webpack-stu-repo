# Step 11：状态管理（Redux Toolkit + react-redux）

## 目标
- 用 `@reduxjs/toolkit`（RTK）+ `react-redux` 接入现代 Redux
- 理解 `configureStore` / `createSlice` / `createAsyncThunk` / `createSelector` 的分工
- 用类型化 hooks 让 TS 体验顺滑
- 用 Provider 把 store 注入组件树，新增一个演示路由

## 为什么是 Redux Toolkit
经典 Redux 模板代码多到劝退（action types、action creators、switch reducer、手接 thunk 中间件、手接 DevTools…）。RTK 把这些**最佳实践内置**，官方现在推荐**所有新项目直接用 RTK**。

| 维度 | 经典 Redux | Redux Toolkit |
|------|-----------|---------------|
| 写 reducer | switch + 返回新对象 | `createSlice`，直接"修改"（Immer） |
| 写 action | 手写 type + creator | `slice.actions.xxx` 自动生成 |
| 异步 | 自己接 thunk/saga | `createAsyncThunk` 自带三态 |
| store | `createStore` + compose | `configureStore` 全配齐 |
| DevTools | 自己 compose | 默认开启 |
| 不可变性 | 自己写 spread | Immer 接管 |

## ① configureStore：项目唯一的 store
```ts
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import todosReducer from './slices/todosSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todos: todosReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`configureStore` 相比 `createStore`：
- 自动接 `redux-thunk`
- 默认开启 Redux DevTools
- 开发态默认开启 immutability / serializability 检查（防呆）

`RootState` / `AppDispatch` 是 RTK 项目的标配类型，必须导出，否则后面 hooks 没法泛型化。

## ② 类型化 hooks：useAppDispatch / useAppSelector
直接用 `useSelector` 每次都要写 `(state: RootState)`，繁琐且容易漏。官方推荐封装一次：

```ts
// src/store/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './index';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

后续业务代码全部用 `useAppDispatch` / `useAppSelector`，禁止直接用原生的。这是社区共识。

## ③ createSlice + Immer：同步 reducer
```ts
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1;       // 看起来在 mutate，实际由 Immer 生成新对象
    },
    incrementByAmount(state, action: PayloadAction<number>) {
      state.value += action.payload;
    },
  },
});

export const { increment, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

### Immer 的本质
Immer 在内部维护一个 **draft（草稿）对象**，你对 draft 的"修改"被记录成 patches，最终自动产出一个新对象。所以你既享受了写法的简洁，又得到了 immutable 的安全。

⚠️ Immer 的坑：
- **不能** `state = newObj`（替换引用），要么 mutate，要么 `return newObj`
- **不要**在 reducer 里调 API、用 Date.now() 等副作用 / 非确定性逻辑
- 对 `Map / Set` 默认不支持，需要 `enableMapSet()`

## ④ createAsyncThunk：异步流的三态
```ts
export const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {
  return await api.getTodos();
});

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: { /* ... */ },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state)        => { state.status = 'loading'; })
      .addCase(fetchTodos.fulfilled, (state, a)   => { state.status = 'succeeded'; state.list = a.payload; })
      .addCase(fetchTodos.rejected, (state, a)    => { state.status = 'failed'; state.error = a.error.message ?? ''; });
  },
});
```

`createAsyncThunk` 会**自动派发 3 个 action**：`pending` / `fulfilled` / `rejected`。组件无需关心 dispatch 细节，只要 `dispatch(fetchTodos())` 即可。

### extraReducers 是什么
slice 的 `reducers` 字段定义**自己的 action**；`extraReducers` 用来响应**别处定义的 action**——经典场景就是 async thunk 的三个生命周期。

### status 用枚举字面量比 boolean 好
```ts
status: 'idle' | 'loading' | 'succeeded' | 'failed';
```

比 `isLoading: boolean` 表达力强很多：可以区分"从未加载"和"加载失败"，UI 可以做更细的状态判断（如 `idle` 时显示空态占位）。

## ⑤ prepare：在 reducer 之前预处理 payload
```ts
addTodo: {
  reducer(state, action: PayloadAction<Todo>) {
    state.list.unshift(action.payload);
  },
  prepare(text: string) {
    return {
      payload: { id: nanoid(), text, done: false } as Todo,
    };
  },
},
```

组件只需要传 `dispatch(addTodo('买牛奶'))`，**id 生成、对象组装交给 prepare**。好处：
- 组件不关心 id 怎么来（消除组件与"业务对象结构"的耦合）
- reducer 始终接收成型数据，保持纯函数特性（id 生成涉及随机，不能放 reducer 里）

## ⑥ createSelector：派生数据 memoize
```ts
export const selectRemainingCount = createSelector(
  [selectTodoList],
  (list) => list.reduce((acc, item) => (item.done ? acc : acc + 1), 0),
);
```

- 输入 selectors 的返回值**没变**时，直接返回上次结果，不重新计算
- 比组件 render 时反复 `list.filter(...).length` 高效
- 多个组件订阅同一个派生值时，避免每个都算一遍

⚠️ memoize 是**引用比较**。如果你 selector 返回的是 `list.filter(...)` 这种新数组，要确保上游 list 引用没变才命中缓存。

## ⑦ Provider 注入位置
```tsx
// src/index.tsx
root.render(
  <Provider store={store}>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </Provider>,
);
```

Provider 通过 React Context 把 store 实例向下传，`useSelector` / `useDispatch` 才能取到。**包在最外层最稳妥**，包在 BrowserRouter 内外都可以——它们彼此无依赖关系。

## ⑧ 路由懒加载兼容
RTK store 是同步初始化的（在 `index.tsx` 顶层 import），所以**所有路由 chunk** 都能拿到相同的 store。新增页面照常 lazy：

```ts
const ReduxDemo = lazy(() => import(/* webpackChunkName: "page-redux" */ '@/pages/ReduxDemo'));
```

webpack 会为 ReduxDemo 单独切出 `page-redux.[hash].chunk.js`，**不会**把 RTK 重复打进每个 chunk——RTK 落在 `vendors` chunk 里（被 splitChunks 提取）。

## 与组件本地 state 的对比

| 场景 | 选 useState | 选 Redux |
|------|------------|---------|
| 弹窗开关、表单输入 | ✅ | ❌（杀鸡用牛刀） |
| 跨多个不相邻组件共享 | ❌（要 prop drilling） | ✅ |
| 切路由不应丢失（购物车、登录态） | ❌（卸载即丢） | ✅ |
| 异步请求 + 缓存 | ❌（自己写麻烦） | ✅ 或选 TanStack Query |
| 复杂业务的可调试性 | ❌ | ✅（DevTools 时间旅行） |

**经验法则**：先用 `useState` / `useReducer`，组件树明显出现"提上去 / 共享"诉求再上 Redux。不要为了"用上 Redux"而 Redux。

## DevTools 实战
浏览器装 [Redux DevTools 扩展](https://github.com/reduxjs/redux-devtools)，本项目无需任何配置即可使用：

- 左侧看每个 action 的派发记录
- 右侧 Diff 看本次 state 变化
- 点击之前的 action 可"时间旅行"回到当时状态
- async thunk 的 `pending/fulfilled/rejected` 都会显示成独立 action

## 思考题
1. 为什么 RTK 推荐用 `createSlice` 而不是手写 reducer？省下的代码量背后的设计哲学是什么？
2. `createAsyncThunk` 已经够用了，什么场景下你才会考虑引入 redux-saga / redux-observable？
3. `createSelector` 的 memoize 是基于引用比较，假如某个 selector 总是返回新数组，会带来什么问题？怎么破？
4. Provider 必须包在路由外吗？包在某个具体页面里行不行？如果有两个 Provider 套了不同 store 呢？
5. Redux 状态切换路由不丢，那刷新页面会丢吗？想做持久化你会选什么方案（redux-persist / 自己写 / 后端拉）？

## 这一步证明了什么
现代 Redux 已经**不是当年那个充满样板代码的 Redux** 了。RTK 让你用最少的代码拿到：可预测的状态、强大的 DevTools、自动化的不可变更新、内置的异步处理、完美的 TS 体验。它不是"老技术回潮"，而是 React 生态里**集中状态管理的事实标准**——尤其是中大型业务项目，几乎无替代选择。把 RTK 的这套心智模型（slice / thunk / selector / typed hooks）吃透，你就掌握了 React 生态最重要的状态管理范式之一。
