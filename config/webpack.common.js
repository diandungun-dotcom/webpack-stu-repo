// webpack.common.js
// 开发和生产环境共享的配置：entry / output / loader / resolve / 共有 plugin
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..');

// ===== 加载 .env 文件 =====
// 优先读 .env.{NODE_ENV}，再读 .env（前者覆盖后者）
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFiles = [
  path.resolve(ROOT, `.env.${NODE_ENV}.local`), // 本地覆盖（不入 git）
  path.resolve(ROOT, `.env.${NODE_ENV}`),       // 按环境
  path.resolve(ROOT, '.env.local'),              // 全局本地覆盖
  path.resolve(ROOT, '.env'),                    // 兜底
];

const envVars = {};
envFiles.forEach((file) => {
  try {
    const parsed = dotenv.parse(require('fs').readFileSync(file));
    Object.entries(parsed).forEach(([k, v]) => {
      // 只允许 APP_ 开头的变量暴露到客户端（防止泄露敏感信息）
      if (k.startsWith('APP_') && envVars[k] === undefined) {
        envVars[k] = v;
      }
    });
  } catch (e) {
    // 文件不存在，忽略
  }
});

// 把 envVars 转成 DefinePlugin 需要的格式：process.env.XXX → JSON 字符串
const definedEnv = Object.entries(envVars).reduce((acc, [k, v]) => {
  acc[`process.env.${k}`] = JSON.stringify(v);
  return acc;
}, {});

module.exports = {
  entry: path.resolve(ROOT, 'src/index.tsx'),

  output: {
    path: path.resolve(ROOT, 'dist'),
    // publicPath：所有资源 URL 的前缀
    //   本地 / 自有域名根目录：'/'
    //   GitHub Pages 子路径：'/<repo-name>/'
    //   CDN：'https://cdn.xxx.com/'
    // 通过环境变量 PUBLIC_PATH 传入，CI 上自动设置成 repo 名
    publicPath: process.env.PUBLIC_PATH || '/',
    // 注意：filename 在 common 里先不带 hash，dev 和 prod 各自覆盖
    // 因为 dev 模式 hash 会让 HMR 复杂化
    clean: true,
    assetModuleFilename: 'assets/[name].[hash:8][ext]',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // 路径别名：业务代码里写 '@/utils/x' 等价于 'src/utils/x'
    // 好处：告别 '../../../../utils/x'；重构文件位置时引用方不用改
    alias: {
      '@': path.resolve(ROOT, 'src'),
    },
  },

  module: {
    rules: [
      // ===== 1. JS / TS / JSX / TSX =====
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { cacheDirectory: true },
        },
      },

      // ===== 4. 图片 =====
      {
        test: /\.(png|jpe?g|gif|webp)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 8 * 1024 },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },

      // ===== 5. 字体 =====
      {
        test: /\.(woff2?|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },

      // ===== 6. SVG（双重身份）=====
      {
        test: /\.svg$/i,
        oneOf: [
          {
            resourceQuery: /url/,
            type: 'asset',
            generator: { filename: 'images/[name].[hash:8][ext]' },
          },
          {
            issuer: /\.s?css$/,
            type: 'asset',
            generator: { filename: 'images/[name].[hash:8][ext]' },
          },
          {
            issuer: /\.[jt]sx?$/,
            use: [
              {
                loader: '@svgr/webpack',
                options: { icon: true },
              },
            ],
          },
        ],
      },

      // ⚠️ 注意：CSS 相关规则**不放这里**！
      // 因为开发用 style-loader，生产用 MiniCssExtractPlugin，loader 不同
      // 我们把 CSS 规则各自放到 webpack.dev.js / webpack.prod.js
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(ROOT, 'public/index.html'),
      filename: 'index.html',
    }),

    // 注入环境变量到客户端代码：
    //   源码里写 process.env.APP_API_BASE
    //   编译后被替换为 "http://localhost:3000/api" 这样的字符串字面量
    // 注意 JSON.stringify 是必须的，否则替换后变成裸标识符会报错
    new webpack.DefinePlugin(definedEnv),

    // 类型检查独立进程：webpack 不等它，构建速度不受影响
    // 类型错误会在终端 / 浏览器 overlay 里显示
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        // 与 tsconfig.json 对齐
        configFile: path.resolve(ROOT, 'tsconfig.json'),
        // diagnosticOptions 控制检查范围
        diagnosticOptions: { syntactic: true, semantic: true },
      },
    }),
  ],
};
