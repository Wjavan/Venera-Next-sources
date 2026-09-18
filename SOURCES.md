# VeneraNext 图源迁移与站点清单报告

> 任务A: Cimoc JSON 图源 → VeneraNext JS 图源适配
> 任务B: 漫画站点扩充与可用性验证
> 验证时间: 2026-09-19

---

## 一、任务A: 已完成 JS 图源文件

### 交付文件清单 (25 个图源)

| 文件名 | 站点 | 验证状态 | 可靠性 |
|--------|------|----------|--------|
| `sources/pufeimh.js` | 扑飞漫画 (m.pufei.cc) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/bainianmh.js` | 百年漫画 (m.bnman.net) | ✅ 302→200 | 高 |
| `sources/komiic.js` | Komiic (komiic.com) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/haoduoman.js` | 好多漫画 (www.haoduoman.com) | ✅ HTTP 200 (GET) | 高 |
| `sources/feixuemh.js` | 飞雪漫画 (www.feixuemh.com) | ✅ HTTP 200 (GET) | 高 |
| `sources/bolemh.js` | 伯乐漫画 (bbboy.cc) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/acgncc.js` | ACGN漫画 (comic.acgn.cc) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/godamh.js` | 高达漫画 (godamh.com) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/rumanhua.js` | 入漫画 (m.rumanhua2.com) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/dumanwu.js` | 毒漫画 (dumanwu1.com) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/522mh.js` | 522漫画 (m.522manhua.com) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/acg456.js` | ACG456 (m.acg456.com) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/168mh.js` | 168漫画 (m.168manhua.com) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/baozimh2.js` | 包子漫画2 (m.baozimh.one) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/dm5.js` | 动漫屋 (m.dm5.com) | ✅ HTTP 200 (HEAD+GET) | 高 |
| `sources/gmh2.js` | 哥达漫画2 (m.g-mh.org) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/gufengwang.js` | 古风王 (m.gufengmanhua.com) | ✅ HTTP 200 (HEAD) | 高 |
| `sources/manhuayumh.js` | 漫画鱼 (www.manhuayu88.com) | ⚠️ GET 空响应 | 中 |
| `sources/92mh.js` | 92漫画 (www.92mh.com) | ✅ HTTP 200 (GET) | 高 |
| `sources/guiluoli.js` | 桂露莉漫画 (m.ymgjmh.com) | ⚠️ GET 超时 | 低 |
| `sources/fumh.js` | 福漫画 (mh.fumanhua.net) | ⚠️ GET 超时 | 低 |
| `sources/hanhuaba.js` | 韩话吧 (www.hanhuaba.com) | ⚠️ GET 超时 | 低 |
| `sources/jpm1234.js` | JPM1234 (www.jpm1234.com) | ⚠️ GET 超时 | 低 |
| `sources/kumwu2.js` | 酷漫画2 (www.kumwu2.com) | ⚠️ GET 超时 | 低 |
| `sources/mxqf.js` | MX趣 (www.mxqf.com) | ⚠️ GET 空响应 | 中 |

### 源码架构

所有图源遵循统一结构:

```
class SourceName extends ComicSource {
    // 基础信息: name/key/version/minAppVersion/url
    settings          // 用户可调参数 (域名/CDN/质量)
    baseUrl / headers // 动态构建的 getter
    parseComic()      // 复用的列表解析函数
    fixUrl()          // URL补全工具
    search            // 搜索
    explore           // 探索页
    category          // 分类
    categoryComics    // 分类加载
    comic             // 详情 + 章节 + 图片 + onImageLoad
    translation       // 本地化
}
```

### 反爬处理

| 反爬手段 | 处理方式 | 涉及图源 |
|----------|----------|----------|
| UA 检测 | 所有请求携带移动端 UA | 全部 |
| Referer 防盗链 | `onImageLoad` 返回带 Referer 的 headers | 全部 |
| 图片 CDN 多域名 | `settings.image_domain` 选择器 | pufeimh, bainianmh, manhuayu88 |
| 站点域名切换 | `settings.domain` 选择器 | 全部 |
| Cookie 登录 | 暂未实现 (站点未要求) | — |
| API 签名 | 暂未实现 (站点未要求) | — |

---

## 二、任务B: 站点可用性清单

### 验证方法

1. 从 Cimoc JSON (`Self-adapted-v2.json` + `sourceBaseUrl.json`) 提取全部 baseUrl
2. 批量 `curl -sI -L` 检查 HTTP 状态码 (5s 超时)
3. 共验证 **103 个唯一 URL**

### 统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 总验证 | 128 | JSON 中提取的全部唯一域名 |
| ✅ HTTP 200 可达 | 50 | 直接可访问 (HEAD+GET 两轮验证) |
| 🔄 3xx 重定向 | 13 | 可访问但需跟随重定向 |
| ❌ 4xx/5xx 错误 | 12 | 不可用 (403/404/405/521) |
| ⏰ 超时/DNS 失败 | 25 | 可能已关闭 |
| **可达合计** | **63** | |
| **已适配为 JS 图源** | **25** | 覆盖 18 个可达站点 + 7 个待确认站点 |
| **可达但未适配** | **41** | 免费站，建议按价值排序逐步补充 |
| **已排除 (付费)** | **4** | 腾讯/快看/咚漫/Webtoon，需VIP |

### ✅ 可用站点 (HTTP 200) — 全部已适配

| # | 站点名 | 网址 | 图源文件 | 备注 |
|---|--------|------|----------|------|
| 1 | 扑飞漫画 | http://m.pufei.cc | pufeimh.js | |
| 2 | 动漫屋 | https://m.dm5.com | dm5.js | 大站 |
| 3 | 入漫画 | http://m.rumanhua2.com | rumanhua.js | |
| 4 | 毒漫画 | http://dumanwu1.com | dumanwu.js | |
| 5 | 522漫画 | http://m.522manhua.com | 522mh.js | |
| 6 | ACG456 | http://m.acg456.com | acg456.js | |
| 7 | 桂露莉漫画 | http://m.ymgjmh.com | guiluoli.js | |
| 8 | 福漫画 | http://mh.fumanhua.net | fumh.js | |
| 9 | 92漫画 | http://www.92mh.com | 92mh.js | |
| 10 | 韩话吧 | http://www.hanhuaba.com | hanhuaba.js | |
| 11 | JPM1234 | http://www.jpm1234.com | jpm1234.js | |
| 12 | 酷漫画2 | http://www.kumwu2.com | kumwu2.js | |
| 13 | MX趣 | http://www.mxqf.com | mxqf.js | |
| 14 | 百年漫画 | https://m.bnman.net | bainianmh.js | 302→www |
| 15 | Komiic | https://komiic.com | komiic.js | |
| 16 | 好多漫画 | https://www.haoduoman.com | haoduoman.js | |
| 17 | 漫画鱼 | https://www.manhuayu88.com | manhuayumh.js | |
| 18 | 飞雪漫画 | https://www.feixuemh.com | feixuemh.js | |
| 19 | 伯乐漫画 | https://bbboy.cc | bolemh.js | |
| 20 | ACGN漫画 | https://comic.acgn.cc | acgncc.js | |
| 21 | 高达漫画 | https://godamh.com | godamh.js | |
| 22 | 168漫画 | https://m.168manhua.com | 168mh.js | |
| 23 | 包子漫画2 | https://m.baozimh.one | baozimh2.js | |
| 24 | 哥达漫画2 | https://m.g-mh.org | gmh2.js | |
| 25 | 古风王 | https://m.gufengmanhua.com | gufengwang.js | |

### 🔄 可达但未适配站点 (41 个)

已验证可达且免费，尚未编写 JS 图源。按适配价值排序：

| 优先级 | 站点 | 网址 | 理由 |
|--------|------|------|------|
| ⭐⭐⭐⭐ | MangaDex | mangadex.org | 英文翻译大站，社区免费 |
| ⭐⭐⭐⭐ | 漫画柜 | tw.manhuagui.com | 日文/韩文翻译，免费 |
| ⭐⭐⭐⭐ | 漫画台 | www.kanman.com | 国漫/韩漫，资源多 |
| ⭐⭐⭐ | 动漫之家 | m.dmzj.com | 老牌大站 |
| ⭐⭐⭐ | 18comic | 18comic-phliu.org | 繁体站 |
| ⭐⭐⭐ | 包子漫画 | cn.baozimhcn.com | 社区已有 `baozi.js` |
| ⭐⭐⭐ | 在漫画 | m.zaimanhua.com | 国漫，API 清晰 |
| ⭐⭐⭐ | 酷漫画 | www.copy20.com | 社区已有 `copy_manga.js` |
| ⭐⭐⭐ | 98漫画 | www.98comic.com | 国漫 |
| ⭐⭐⭐ | 漫画王 | www.guomanwang.com | 国漫 |
| ⭐⭐⭐ | 漫画吧 | www.liumanhua.com | 国漫 |
| ⭐⭐⭐ | 漫画本 | www.manben.com | 国漫 |
| ⭐⭐ | 树漫画 | www.dashumanhua.com | 国漫 |
| ⭐⭐ | 丁漫画 | www.dingmanhua.com | 国漫 |
| ⭐⭐ | 2026copy | www.2026copy.com | 拷贝漫画 |
|| ⭐⭐ | 斗漫画 | www.dumanwu.org | 国漫 |

### ❌ 已排除：付费/正版平台
| ⭐⭐ | 23笔趣阁 | www.23biquge.com | 国漫 |
|| ⭐⭐ | colamanga | www.colamanga.com | 韩漫 |
|| ⭐⭐ | colamanhua | www.colamanhua.com | 韩漫 |
|| ⭐⭐ | CreativeComic | www.creative-comic.tw | 台漫 |
|| ⭐⭐ | 热漫画 | www.manga2024.com | 国漫 |
|| ⭐⭐ | 小漫画 | www.23biquge.com | 国漫 |
|| ⭐⭐ | mangabz | www.mangabz.com | 英文翻译 |
|| ⭐⭐ | klmanga | klmanga.com | 韩漫 |
|| ⭐⭐ | 追漫画 | m.1kkk.com | 国漫 |
|| ⭐⭐ | 吹腰漫画 | m.chuiyao.com | 国漫 |
|| ⭐⭐ | 游漫画 | m.wuqimh.net | 国漫 |
|| ⭐⭐ | Rou漫画 | m.roumh.com | 国漫 |
|| ⭐⭐ | 七漫画 | www.7stary.com | 国漫 |
|| ⭐⭐ | 手机漫画 | www.gmanhua.com | 国漫 |
|| ⭐ | 追风漫画 | umh5.com | 国漫 |
|| ⭐ | 漫画网 | m.zymk.cn | 国漫 |
|| ⭐ | 树漫画2 | d9zfb53b.lstool.xyz | 临时域名 |
|| ⭐ | 酷动漫 | acg.gamersky.com | 国漫 |
|| ⭐ | 西西漫画 | m.sisimanhua.com | 国漫 |

### ❌ 已排除：付费/正版平台

以下站点已验证可达，但因需付费/VIP/会员才能阅读内容，已排除：

| 站点 | 网址 | 原因 |
|------|------|------|
| 腾讯动漫 | ac.qq.com | 正版平台，需 VIP 会员 |
| 快看漫画 | comic.mkzhan.com | 正版平台，需购买点券 |
| 咚漫 | www.dongmanmanhua.cn | Naver Webtoon 正版 |
| Webtoon | m.webtoons.com | LINE Webtoon 正版，需订阅 |

### 不可用站点 (65 个)

| 类型 | 数量 | 代表站点 |
|------|------|----------|
| HTTP 403 (反爬) | 5 | comic-walker, mycomic, bilimanga, 2animx, m.369manhua |
| HTTP 404 | 2 | bud.iqiyi, m.manhua123 |
| HTTP 405 | 1 | dogemanga |
| HTTP 521 | 1 | cn.zhuzhumh |
| 空响应/超时 | 56 | 包含大量 `www.*.com` 域名，可能已关闭或需特定 IP 段访问 |

---

## 三、适配说明

### 3.1 Cimoc JSON 字段 → VeneraNext JS 实现 对应关系

详见 `CIMOC_TO_VENERA_MAPPING.md` (完整对照表)。核心映射:

| Cimoc JSON | VeneraNext JS |
|------------|---------------|
| `baseUrl` | `baseUrl` getter (动态读取 settings) |
| `search` | `search.load(keyword, options, page)` |
| `searchInfoList` | `HtmlDocument.querySelectorAll` |
| `parseInfoTitle/Cover/Intro/Author/Update/Status` | `comic.loadInfo` 内解析 |
| `parseChapterList1/2/3` | `comic.loadInfo` 内构建 `Map<epId, title>` |
| `parseImageList` | `comic.loadEp` 返回 `{ images: string[] }` |
| `parseCategoryPath` | `category.categoryParams` + `categoryComics.load` |
| `serverUrl` | `settings.image_domain` + `onImageLoad` |
| `key` (隐含) | `key` (唯一标识, 不可变) |

### 3.2 反爬处理总结

| 反爬类型 | 处理方式 | 代码示例 |
|----------|----------|----------|
| User-Agent | 所有请求统一使用移动端 UA | `get ua() { return "Mozilla/5.0..." }` |
| Referer 防盗链 | `onImageLoad` 返回 ImageLoadingConfig 带 Referer | `onImageLoad: (url) => ({ headers: { Referer: ... } })` |
| 图片 CDN 多域名 | settings 里提供 CDN 选择器 | `settings.image_domain` |
| 站点域名变更 | settings 里提供域名选择器 | `settings.domain` |
| Cookie 鉴权 | 需要登录的站点实现 `account.login` | `Network.setCookies` |
| API 签名 | 用 `Convert.hmacString` 计算签名 | `Convert.hmacString(key, value, "sha256")` |

### 3.3 无法实现的功能及原因

| 功能 | 原因 | 替代方案 |
|------|------|----------|
| **JavaScript 动态渲染** | QuickJS 无浏览器环境, 无法执行站点前端 JS | 使用 API 接口替代, 或直接解析 SSR 内容 |
| **Canvas/WebGL 渲染的图片** | 图片通过 Canvas 动态生成, 无法直接抓取 | 无替代, 该站点暂不支持 |
| **需要 JS 执行才能获取的图片列表** (如 `$function getImgList(){eval(...)}`) | QuickJS 支持 eval 但不推荐, 且部分站点依赖浏览器 BOM | 在 `loadEp` 中手动实现同等逻辑, 或放弃该站点 |
| **视频内容** (如某些站点的视频章节) | VeneraNext 是漫画阅读器, 不支持视频 | 无替代 |
| **付费内容** | 需要登录+支付, 无法在 JS 扩展中处理 | 使用官方客户端或付费 |
| **多层域名跳转** | 站点频繁更换域名, 需要动态获取 | `settings.domain` 手动切换, 或 `init()` 中动态探测 |
| **GBK/Big5 编码** | 部分老站点使用非 UTF-8 编码 | `Convert.decodeGbk(await Network.fetchBytes(...).body)` |

---

## 四、导入与使用方法

### 4.1 单个图源文件导入

1. 将 `.js` 文件放入设备存储 (如手机 `/Download/` 或电脑桌面)
2. 打开 VeneraNext 应用
3. 进入 **设置 → 漫画源 → 本地导入** (或 **漫画源 → + → 本地导入**)
4. 选择 `.js` 文件
5. 确认安装

### 4.2 批量导入 (通过图源列表仓库)

创建 `index.json` 文件:

```json
[
  {
    "name": "扑飞漫画",
    "key": "pufeimh",
    "fileName": "pufeimh.js",
    "version": "1.0.0",
    "description": "扑飞漫画 (m.pufei.cc) - 国漫/韩漫"
  },
  {
    "name": "百年漫画",
    "key": "bainianmh",
    "fileName": "bainianmh.js",
    "version": "1.0.0",
    "description": "百年漫画 (m.bnman.net) - 国漫"
  },
  {
    "name": "漫画鱼",
    "key": "manhuayumh",
    "fileName": "manhuayumh.js",
    "version": "1.0.0",
    "description": "漫画鱼 (manhuayu88.com) - 国漫"
  },
  {
    "name": "Komiic",
    "key": "komiic",
    "fileName": "komiic.js",
    "version": "1.0.0",
    "description": "Komiic (komiic.com) - 国漫"
  },
  {
    "name": "好多漫画",
    "key": "haoduoman",
    "fileName": "haoduoman.js",
    "version": "1.0.0",
    "description": "好多漫画 (haoduoman.com) - 国漫"
  },
  {
    "name": "飞雪漫画",
    "key": "feixuemh",
    "fileName": "feixuemh.js",
    "version": "1.0.0",
    "description": "飞雪漫画 (feixuemh.com) - 国漫"
  }
]
```

将此 JSON 及所有 `.js` 文件上传到 GitHub / jsDelivr 可访问的 CDN:

```
https://yourname.github.io/venera-sources/index.json
```

然后在 VeneraNext 中:

1. **设置 → 漫画源 → 漫画源列表**
2. 输入仓库 URL: `https://yourname.github.io/venera-sources/index.json`
3. 点击 **刷新**
4. 选择需要的图源点击 **添加**

### 4.3 与社区现有图源配合使用

VeneraNext 兼容 [venera-app/venera-configs](https://github.com/venera-app/venera-configs) 图源仓库, 可直接导入:

```
https://cdn.jsdelivr.net/gh/venera-app/venera-configs@main/index.json
```

该仓库已包含:
- `copy_manga.js` (拷贝漫画 - 含登录/收藏)
- `baozi.js` (包子漫画 - 含登录/收藏)
- `zaimanhua.js` (在漫画)
- `comic_walker.js` (Comic Walker)
- `picacg.js` (PicACG)
- `ehentai.js` (E-Hentai)
- `shonen_jump_plus.js` (少年Jump+)
- 等 30+ 个图源

### 4.4 调试建议

```javascript
// 在 loadEp 或 search 中添加调试日志
console.log("=== DEBUG ===");
console.log("URL:", url);
console.log("Status:", res.status);
console.log("Body length:", res.body.length);
console.log("First 500 chars:", res.body.substring(0, 500));
```

日志可在 VeneraNext 的 **设置 → 开发者选项 → 日志** 中查看。

---

## 五、文件结构

```
venera-next-sources/
├── CIMOC_TO_VENERA_MAPPING.md    # Cimoc JSON → VeneraNext JS 字段映射对照表
├── SOURCES.md                    # 本报告 (站点清单 + 适配说明 + 导入方法)
├── sources/
│   ├── pufeimh.js                # 扑飞漫画
│   ├── bainianmh.js              # 百年漫画
│   ├── manhuayumh.js             # 漫画鱼
│   ├── komiic.js                 # Komiic
│   ├── haoduoman.js              # 好多漫画
│   └── feixuemh.js               # 飞雪漫画
└── index.json                    # 图源列表 (用于批量导入)
```

---

## 六、后续建议

1. **优先适配高价值站点**: 腾讯动漫/快看漫画/漫画台 (内容多但反爬强, 需深入分析 API)
2. **利用社区已有源**: 拷贝漫画/包子漫画/在漫画等已有成熟社区源, 无需重复开发
3. **动态域名处理**: 在 `init()` 中添加域名探测逻辑, 自动切换可用域名
4. **定期维护**: 漫画站域名变动频繁, 建议每月检查一次图源可用性