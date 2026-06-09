// createSlice：一次性生成 reducer + actions
// - 内部用 Immer，可以"看似"直接 mutate state（实际产生新对象）
// - reducer 的 key 就是 action.type 的尾部（counter/increment 等）
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment(state) {
      // 这里看起来在 mutate，其实是 Immer 帮你生成了 immutable 的新 state
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
    // 带 payload 的 action，泛型告诉 TS payload 的类型
    incrementByAmount(state, action: PayloadAction<number>) {
      state.value += action.payload;
    },
    reset(state) {
      state.value = 0;
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;

// 默认导出 reducer，供 store 组装
export default counterSlice.reducer;
