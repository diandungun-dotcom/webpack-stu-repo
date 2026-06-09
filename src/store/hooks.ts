// 在项目里统一封装"带类型"的 hooks，避免每处 useSelector 都手写 RootState
// 官方推荐做法：https://redux.js.org/usage/usage-with-typescript#define-typed-hooks
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import type { AppDispatch, RootState } from './index';

// 用 AppDispatch 替代默认 dispatch，让 thunk 的返回值（Promise）类型正确
export const useAppDispatch: () => AppDispatch = useDispatch;
// TypedUseSelectorHook 把 state 参数自动绑定到 RootState
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
