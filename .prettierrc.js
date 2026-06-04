// Prettier 配置
// 团队约定一份就一份，不要每个人 IDE 各设各的
module.exports = {
  printWidth: 100,           // 每行最大 100 字符
  tabWidth: 2,                // 缩进 2 空格
  useTabs: false,             // 用空格不用 tab
  semi: true,                 // 句末加分号
  singleQuote: true,          // 字符串用单引号
  jsxSingleQuote: false,      // JSX 里属性用双引号（社区惯例）
  trailingComma: 'all',       // 多行结构最后一项加逗号（git diff 更清爽）
  bracketSpacing: true,       // { foo } 而非 {foo}
  bracketSameLine: false,     // JSX 闭合 > 单独一行
  arrowParens: 'always',      // 箭头函数参数永远加括号 (x) => x
  endOfLine: 'lf',            // 行尾用 LF（避免跨平台 CRLF 问题）
};
