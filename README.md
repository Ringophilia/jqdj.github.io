# 机枪电竞 - 俱乐部展示页

粉白可爱风的电竞俱乐部静态展示页面，部署在 GitHub Pages 上。

## 项目结构

```
├── index.html          # 展示首页
├── bg.js               # 背景装饰动画
├── logo.webp           # 俱乐部 Logo（192x192 webp）
├── assets/
│   └── qrcode.png      # 微信二维码（由管理后台上传）
├── favicon/            # 网站图标
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest
└── admin/
    ├── index.html       # 管理后台页面
    └── admin.js         # 管理后台逻辑
```

## 功能

- 俱乐部信息展示（介绍、联系方式、微信二维码）
- 管理后台通过 GitHub API 上传/更新微信二维码，无需后端服务器
- 浮动爱心、星星背景动画 + 卡片入场动效 + hover 放大效果

## 部署

1. Fork 或 clone 本仓库
2. 进入仓库 Settings → Pages
3. Source 选 `Deploy from a branch`，Branch 选 `main` / `/ (root)`
4. 保存后等待 1-2 分钟即可访问

## 自定义内容

编辑 `index.html` 中带有 `placeholder` 类名的文案，替换为你自己的俱乐部介绍和联系方式。

## 管理后台使用

管理后台用于更新微信二维码图片，访问路径为 `/admin/`。

仓库地址已硬编码为 `Ringophilia/jqdj.github.io`，管理员只需输入 Token 即可登录。

### 前置条件

- 管理员需要是仓库的 Collaborator（Write 权限）
- 每位管理员需生成自己的 GitHub Personal Access Token（需要 `repo` 权限，且 Contents 为 Read and write）

### 操作步骤

1. 访问 `https://你的域名/admin/`
2. 输入 Personal Access Token
3. 登录后可查看当前二维码，上传新的二维码图片
4. 上传后 GitHub Pages 会在 1-2 分钟内自动部署更新

### 生成 Personal Access Token

**Classic Token：**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token，勾选 `repo` 权限
3. 生成后妥善保存

**Fine-grained Token：**
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 选择对应仓库，Repository permissions 中将 `Contents` 设为 `Read and write`
3. 生成后妥善保存

## 安全措施

- CSP 策略限制资源加载来源
- 零内联脚本，所有事件通过 addEventListener 绑定
- 登录失败 5 次后锁定 15 分钟
- 会话 30 分钟自动超时登出
- Token 不持久化存储，关闭页面即清除
- 文件类型、大小、magic bytes 三重校验
- 禁止 iframe 嵌入（JS 检测）
- 管理后台 noindex 防爬虫
- 全部 DOM 操作使用安全 API，无 innerHTML 拼接
