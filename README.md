# 小阳的工作台

面向 iPhone 的本地优先 PWA，包含学习计时与汇总、任务打卡、求职管理、饮品日历、日程、PDF 资料和数据备份。

## 本地运行

```bash
npm install
npm run dev -- --host 0.0.0.0
```

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`。

## 数据说明

- 私人数据和 PDF 存在当前浏览器的 IndexedDB 中，不会默认上传。
- 普通 JSON 备份不包含 PDF；完整备份包含 PDF。
- 切后台或锁屏不会暂停正在运行的学习计时器。应用重新打开后按时间戳恢复时长。
- 招聘页只接收包含官方链接和来源的数据。`public/jobs.json` 当前为空，不会用演示职位冒充实时信息。

## 免费部署

### Cloudflare Pages

1. 将项目上传到 GitHub。
2. 在 Cloudflare Pages 中选择该仓库。
3. 构建命令填写 `npm run build`。
4. 输出目录填写 `dist`。
5. 部署后会获得免费的 `项目名.pages.dev` HTTPS 地址，不需要购买域名。

### GitHub Pages

项目已经包含 `.github/workflows/deploy-pages.yml`。将项目推送到 GitHub 后，在仓库 Settings > Pages 中将 Source 设为 GitHub Actions，工作流会自动部署。

## 安装到 iPhone

1. 用 Safari 打开 HTTPS 部署地址。
2. 点击 Safari 底部的共享按钮。
3. 选择“添加到主屏幕”。

局域网 HTTP 地址只用于预览，不能完整测试 iPhone 的 PWA 安装和离线能力。

## 招聘每日更新

界面会每天读取一次 `jobs.json`，但真正采集央国企、事业单位、银行和运营商官网需要额外的定时采集任务。不同官网存在改版、验证码和反爬限制，因此采集服务必须保留官方链接、来源和核验时间，并允许人工核验；当前版本不会伪造已连接状态。
