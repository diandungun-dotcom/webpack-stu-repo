// 全局类型声明文件
// 告诉 TS：遇到这些非 JS 模块的 import 应该是什么类型

// ===== CSS Modules =====
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// ===== 全局样式 =====
declare module '*.scss';
declare module '*.css';

// ===== 图片：导出图片的 URL 字符串 =====
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}

// ===== SVG =====
// 默认导出：React 组件（由 @svgr/webpack 提供）
declare module '*.svg' {
  import * as React from 'react';
  const Component: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default Component;
}

// 带 ?url 后缀的 SVG：导出 URL 字符串
declare module '*.svg?url' {
  const src: string;
  export default src;
}
