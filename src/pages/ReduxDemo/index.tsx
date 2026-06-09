// Redux Toolkit 现代用法演示页
// 覆盖：useSelector / useDispatch / createSlice / Immer / createAsyncThunk / createSelector
import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { decrement, increment, incrementByAmount, reset } from '@/store/slices/counterSlice';
import {
  addTodo,
  clearCompleted,
  fetchTodos,
  removeTodo,
  selectRemainingCount,
  selectTodoList,
  selectTodosError,
  selectTodosStatus,
  toggleTodo,
} from '@/store/slices/todosSlice';

import styles from './index.module.scss';

const ReduxDemo: React.FC = () => {
  return (
    <div className={styles.page}>
      <h2>🧰 Redux Toolkit 现代用法演示</h2>
      <p className={styles.intro}>
        现代 Redux 推荐使用 <code>@reduxjs/toolkit</code>（RTK）+ <code>react-redux</code>{' '}
        的组合。RTK 内置 Immer、Thunk、DevTools，几乎消除了所有&ldquo;经典 Redux 模板代码&rdquo;。
      </p>

      <CounterSection />
      <TodosSection />
    </div>
  );
};

// ===== 1. 同步 slice + Immer：Counter =====
const CounterSection: React.FC = () => {
  // 用类型化的 useAppSelector 直接拿到 number，避免每处写 (state: RootState)
  const value = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  const [step, setStep] = useState(5);

  return (
    <section className={styles.block}>
      <h3>① 同步 reducer + Immer</h3>
      <p>
        在 <code>createSlice</code> 中直接&ldquo;修改&rdquo; state，Immer 会生成新对象。组件通过
        <code> useSelector</code> 订阅、<code> useDispatch</code> 派发。
      </p>
      <div className={styles.counter}>
        <button onClick={() => dispatch(decrement())}>-</button>
        <span className={styles.count}>{value}</span>
        <button onClick={() => dispatch(increment())}>+</button>
        <input
          type="number"
          value={step}
          onChange={(e) => setStep(Number(e.target.value) || 0)}
          className={styles.stepInput}
        />
        <button onClick={() => dispatch(incrementByAmount(step))}>+{step}</button>
        <button onClick={() => dispatch(reset())}>重置</button>
      </div>
      <p className={styles.tip}>
        ✅ 切换到其他路由再切回来，<code>count</code> 仍然保留（state 由 store 持有，不随
        组件卸载丢失）。
      </p>
    </section>
  );
};

// ===== 2. 异步 thunk + 派生 selector：Todos =====
const TodosSection: React.FC = () => {
  const list = useAppSelector(selectTodoList);
  const status = useAppSelector(selectTodosStatus);
  const error = useAppSelector(selectTodosError);
  // memoized selector：只有 list 变化才会重新计算
  const remaining = useAppSelector(selectRemainingCount);

  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState('');

  // 首次进入页面时拉取数据；status === 'idle' 是常见的去重写法
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTodos());
    }
  }, [status, dispatch]);

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    dispatch(addTodo(text));
    setDraft('');
  };

  return (
    <section className={styles.block}>
      <h3>② 异步 thunk + 派生 selector</h3>
      <p>
        通过 <code>createAsyncThunk</code> 处理异步流程，自动派发{' '}
        <code>pending / fulfilled / rejected</code>；通过 <code>createSelector</code> 对派生数据做
        memoize。
      </p>

      <div className={styles.todoForm}>
        <input
          type="text"
          placeholder="输入待办内容后回车 / 点击添加"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button onClick={handleAdd}>添加</button>
        <button onClick={() => dispatch(fetchTodos())} disabled={status === 'loading'}>
          {status === 'loading' ? '加载中…' : '重新拉取'}
        </button>
        <button onClick={() => dispatch(clearCompleted())}>清除已完成</button>
      </div>

      {status === 'loading' && <div className={styles.loading}>数据加载中…</div>}
      {status === 'failed' && (
        <div className={styles.error}>
          加载失败：{error}（小概率随机失败，点击「重新拉取」即可）
        </div>
      )}

      <ul className={styles.todoList}>
        {list.map((todo) => (
          <li key={todo.id} className={todo.done ? styles.done : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => dispatch(toggleTodo(todo.id))}
              />
              <span>{todo.text}</span>
            </label>
            <button onClick={() => dispatch(removeTodo(todo.id))}>删除</button>
          </li>
        ))}
        {list.length === 0 && status === 'succeeded' && (
          <li className={styles.empty}>暂无待办，去添加一个吧～</li>
        )}
      </ul>

      <p className={styles.tip}>
        共 <b>{list.length}</b> 项，剩余 <b>{remaining}</b> 项未完成
      </p>
    </section>
  );
};

export default ReduxDemo;
