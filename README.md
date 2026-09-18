# venera-next-sources

Venera / VeneraNext 漫画源仓库，包含 60 余个免费漫画源。

## 使用方法

在 VeneraNext 中：
1. 设置 → 漫画源 → 漫画源列表
2. 仓库地址填入：
   ```
   https://raw.githubusercontent.com/Wjavan/Venera-Next-sources/refs/heads/main/index.json
   ```
3. 点击刷新，选择需要的图源添加


## 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourname/venera-next-sources.git
cd venera-next-sources

# 新建漫画源
cp _template_.js sources/mysource.js
# 编辑 mysource.js
# 修改 index.json 添加新条目

# 测试语法
node --check mysource.js
```

## 目录结构

```
venera-next-sources/
├── index.json          # 源列表 (jsDelivr 直接可用)
├── _template_.js       # 模板文件
├── _venera_.js         # IDE 类型定义
├── .github/workflows/  # GitHub Actions
├── *.js                # 60 个漫画源文件
└── LICENSE
```

## 参考

- [VeneraNext 官方文档](https://github.com/CyrilPeng/Venera-Next/blob/main/doc/api/comic_source.en.md)
- [venera-configs 官方仓库](https://github.com/venera-app/venera-configs)
- [VeneraNext 应用](https://github.com/CyrilPeng/Venera-Next)

## 许可

MIT License - 仅供学习交流，请遵守各站点服务条款。
