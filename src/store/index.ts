// Redux Toolkit 推荐的入口：configureStore
// - 内置 redux-thunk（开箱即用支持异步 action）
// - 默认开启 Redux DevTools（无需手动接 compose）
// - 默认开启 immutability/serializability 检查（开发态防呆）
import { configureStore } from '@reduxjs/toolkit';

import counterReducer from './slices/counterSlice';
import todosReducer from './slices/todosSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todos: todosReducer,
  },
});

// 这两个类型是 RTK 项目的标配
// - RootState：useSelector 时拿到的 state 形状
// - AppDispatch：因为 dispatch 需要识别 thunk 返回的 Promise，必须用推断出的 dispatch 类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
