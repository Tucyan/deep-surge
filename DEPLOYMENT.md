# 第一层 Demo 部署

- 游戏地址：<https://taskstream.xyz/deep-surge/>
- 公开仓库：<https://github.com/Tucyan/deep-surge>
- 主分支：`main`；服务目录：`/opt/deep-surge`。
- 部署内容为 `dist/` 第一层 Five-voyage Three.js Demo，当前平衡试测 v5，无 Boss、暂无存档。
- Nginx 内部静态入口 `127.0.0.1:3183`，通过现有 HTTPS 网站的 `/deep-surge/` 代理公开。无需新增端口或域名证书。

## 一键更新

先在本地提交游戏修改并推送到公开仓库 `main`（GitHub CLI 使用 Tucyan 账户）。然后双击本目录 `一键更新服务器.cmd`。脚本通过 SSH root 登录服务器，从公开仓库拉取最新提交，检查语法、全部测试和资源清单，最后原子切换网站目录。

也可直接运行：

```powershell
ssh root@123.57.154.12 'bash /opt/deep-surge/repo/scripts/update-server.sh'
```

下载最多等待 60 秒，不自动重试；拉取或验证失败不会替换线上版本。无需安装项目依赖或构建。服务器需要现有 Git、Node.js/npm、Nginx、curl、flock 和 timeout。

首次通过 SSH 上传 Git bundle 初始化服务器，避免首次下载大量素材。`--local` 仅用于部署服务器仓库当前 HEAD，日常更新不使用此参数。一键更新不修改 Nginx 或重新加载服务。

## 手动回滚

旧版本保留在 `/opt/deep-surge/releases/`，不自动删除。查看 `readlink /opt/deep-surge/current` 和 `ls /opt/deep-surge/releases`，确定要回滚的旧目录后：

```bash
ln -s /opt/deep-surge/releases/<旧版本目录>/dist /opt/deep-surge/current-rollback
mv -Tf /opt/deep-surge/current-rollback /opt/deep-surge/current
```

根仓库仍独立维护设计；本仓库 `docs/` 和两份首版设计文档是本次发布的资料快照。未来设计修改应从根仓库同步，不能用快照覆盖根仓库。Unity 实验、Blender 源工程、个人缓存和本地规划不在本次发布范围。Nginx 仅公开运行目录，不公开 Git、原素材包、测试及部署脚本。
