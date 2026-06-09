// 演示更接近真实业务的 slice：
// 1) 同步 reducer：增删改
// 2) 异步 thunk：createAsyncThunk + extraReducers（pending / fulfilled / rejected）
// 3) 派生数据：用 createSelector 做 memoized selector
import { createAsyncThunk, createSelector, createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../index';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TodosState {
  list: Todo[];
  // 用枚举字面量描述加载状态，比 isLoading: boolean 表达力更强
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TodosState = {
  list: [],
  status: 'idle',
  error: null,
};

// 模拟一个网络请求：随机延迟 + 小概率失败，方便演示 pending/fulfilled/rejected
const mockFetchTodos = (): Promise<Todo[]> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.15) {
        reject(new Error('网络抖动，请重试'));
        return;
      }
      resolve([
        { id: nanoid(), text: '阅读 Redux Toolkit 官方文档', done: true },
        { id: nanoid(), text: '掌握 createSlice 与 Immer 的工作机制', done: false },
        { id: nanoid(), text: '理解 createAsyncThunk 的三态', done: false },
      ]);
    }, 800);
  });

// createAsyncThunk：自动派发 pending / fulfilled / rejected 三种 action
// 第一个参数是 type 前缀，第二个是 payloadCreator
export const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {
  const data = await mockFetchTodos();
  return data;
});

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    addTodo: {
      // prepare 回调：在 reducer 执行前对 payload 做预处理
      // 这里把"输入一个文本"转换成完整的 Todo 对象（生成 id）
      // 这样 reducer 始终接收已成型的数据，组件不需要关心 id 怎么来
      reducer(state, action: PayloadAction<Todo>) {
        state.list.unshift(action.payload);
      },
      prepare(text: string) {
        return {
          payload: {
            id: nanoid(),
            text,
            done: false,
          } as Todo,
        };
      },
    },
    toggleTodo(state, action: PayloadAction<string>) {
      const todo = state.list.find((item) => item.id === action.payload);
      if (todo) {
        todo.done = !todo.done;
      }
    },
    removeTodo(state, action: PayloadAction<string>) {
      state.list = state.list.filter((item) => item.id !== action.payload);
    },
    clearCompleted(state) {
      state.list = state.list.filter((item) => !item.done);
    },
  },
  // extraReducers 用来响应"非本 slice 自己定义的 action"
  // 经典场景：createAsyncThunk 派发的三个生命周期 action
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? '未知错误';
      });
  },
});

export const { addTodo, toggleTodo, removeTodo, clearCompleted } = todosSlice.actions;

// ===== Selectors =====
// 基础 selector，直接从 state 取值
export const selectTodoList = (state: RootState) => state.todos.list;
export const selectTodosStatus = (state: RootState) => state.todos.status;
export const selectTodosError = (state: RootState) => state.todos.error;

// createSelector：派生数据 + memoize，只在依赖变化时重算
// 这里计算"剩余未完成数量"——避免组件 render 时反复 filter
export const selectRemainingCount = createSelector([selectTodoList], (list) =>
  list.reduce((acc, item) => (item.done ? acc : acc + 1), 0),
);

export default todosSlice.reducer;
