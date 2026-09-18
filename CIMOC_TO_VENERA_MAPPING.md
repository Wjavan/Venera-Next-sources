# Cimoc JSON 字段 → VeneraNext JS 实现 映射对照表

> 基于 VeneraNext 官方规范（`doc/api/comic_source.en.md`、`doc/api/js.en.md`）与 Cimoc 源码（`MangaParser.java`、`CategoryParser.java`）整理

---

## 1. 基础信息字段

| Cimoc JSON 字段 | VeneraNext JS 对应 | 说明 |
|-----------------|---------------------|------|
| `baseUrl` | `baseUrl` (getter) | 站点基础域名，建议用 getter 动态生成（支持多域名切换） |
| `serverUrl` | 图片 CDN 域名配置 | 在 `settings` 中以 select 形式暴露，`onImageLoad` / `loadEp` 中拼接 |
| `key` (隐含，键名) | `key` | 唯一标识，**发布后严禁修改**，关联收藏/历史/缓存 |
| — | `name` | 显示名称（中文） |
| — | `version` | 扩展版本号，语义化版本 |
| — | `minAppVersion` | 最低兼容 App 版本（建议 `1.6.0`） |
| — | `url` | 扩展更新地址（通常指向 jsdelivr CDN） |

---

## 2. 网络请求与反爬

| Cimoc 字段/行为 | VeneraNext 实现方式 | 关键 API |
|-----------------|---------------------|----------|
| 请求头 | `headers` getter / 方法内构建 | `Network.get/post(headers)` |
| Referer | 头部 `Referer` / `referer` | 同 `headers` |
| User-Agent | 头部 `User-Agent` | 同 `headers` |
| Cookie | `Network.setCookies` / `Cookie` 头 | `account.login` 成功后 `Network.setCookies` |
| 签名/加密参数 | `Convert.hmacString`、`Convert.md5` 等 | `Convert` 命名空间 |
| 多图床/多 CDN | `settings` 里提供 select 选项，运行时读取 | `this.loadSetting('cdn_domain')` |

**注意**：VeneraNext 运行在 QuickJS（flutter_qjs），**无 `window`/`document`/`fetch`/`XMLHttpRequest`**，必须使用 `Network` API。

---

## 3. 搜索

| Cimoc 字段 | 含义 | VeneraNext 实现 |
|------------|------|-----------------|
| `search` | 搜索接口路径模板（`%s`=关键词，`%d`=页码） | `search.load(keyword, options, page)` |
| `searchInfoList` | 列表项选择器 | `HtmlDocument` + `querySelectorAll` 解析 |
| `searchInfoCid` | 详情页链接选择器 | 解析出 `href`，取最后一段作为 `id` |
| `searchInfoTitle` | 标题选择器 | `.text.trim()` |
| `searchInfoCover` | 封面图选择器 | `attributes['src']` 或 `data-src` |
| `searchInfoAuthor` | 作者选择器 | 同理 |
| `searchInfoUpdate` | 更新信息选择器 | 同理 |
| — | 分页/筛选 | `search.optionList` 提供排序、类型等选项；或实现 `loadNext` 做无限滚动 |

**返回值**：
```js
return { comics: Comic[], maxPage: number }
// 或 loadNext: { comics: Comic[], next: string|null }
```

---

## 4. 漫画详情

| Cimoc 字段 | 含义 | VeneraNext 实现 (`comic.loadInfo`) |
|------------|------|-------------------------------------|
| `parseInfoTitle` | 标题 | `document.querySelector(...).text.trim()` |
| `parseInfoCover` | 封面 | `attributes['src']` |
| `parseInfoIntro` | 简介 | 同上 |
| `parseInfoAuthor` | 作者 | 同上 |
| `parseInfoUpdate` | 更新时间/最新章节 | 同上，建议归一化为 `YYYY-MM-DD` |
| `parseInfoStatus` | 连载状态 | 映射为标签：`连载中` / `已完结` |
| `parseChapterList1/2/3` | 章节列表选择器 | 遍历构建 `Map<string, string>`：key=索引，value=章节名 |
| `parseChapterPath` | 章节链接选择器 | `attributes['href']` |
| `parseChapterTitle` | 章节标题选择器 | 同上 |

**返回值**：`ComicDetails` 对象
```js
return new ComicDetails({
  title, cover, description,
  tags: { 作者: [author], 标签: tags[] },
  chapters: Map<string, string>,  // key=epId(索引)，value=章节名
  recommend: [],  // 可选推荐
  updateTime: 'YYYY-MM-DD'
})
```

---

## 5. 章节图片

| Cimoc 字段 | 含义 | VeneraNext 实现 |
|------------|------|-----------------|
| `parseImageList` | 图片标签选择器 | `comic.loadEp(comicId, epId)` 返回 `{ images: string[] }` |
| `parseImageUrl` | 图片属性名（`src`/`data-src`/`data-echo` 等） | 同上 |
| `parseImageServerUrl` / `serverUrl` | 图片服务器域名 | 在 `loadEp` 或 `onImageLoad` 中拼接完整 URL |
| — | 防盗链 Referer | `comic.onImageLoad(url, comicId, epId)` 返回 `ImageLoadingConfig` |

**关键点**：
- `loadEp` 返回图片直链数组
- `onImageLoad` 可为每张图单独配置 headers/Referer/修改响应/失败重试
- 图片 URL 若需动态签名，用 `onImageLoad` 返回 `ImageLoadingConfig`（含 `onResponse` 处理加密响应）

---

## 6. 分类/探索

| Cimoc 字段 | 含义 | VeneraNext 实现 |
|------------|------|-----------------|
| `parseCategoryPath` | 分类页 URL 模板 | `category` 配置 `categoryParams` 对应每个分类的参数 |
| `parseCategoryInfoList` | 分类列表项选择器 | `categoryComics.load(category, param, options, page)` |
| `parseCategoryInfoCid/Title/Cover/Author/Update` | 同搜索字段 | 复用 `parseComic` / `parseJsonComic` 解析函数 |
| — | 排序/筛选 | `categoryComics.optionList` / `optionLoader` |
| — | 排行榜 | `categoryComics.ranking.load(option, page)` |

---

## 7. 账号/收藏/评论（可选）

| 功能 | Cimoc | VeneraNext |
|------|-------|------------|
| 登录 | 隐含在 parser 逻辑 | `account.login(account, pwd)` + `Network.setCookies` |
| 登出 | — | `account.logout()` + `Network.deleteCookies` |
| 网页登录 | — | `account.loginWithWebview` |
| Cookie 登录 | — | `account.loginWithCookies.validate(values)` |
| 收藏 | — | `favorites.addOrDelFavorite/loadFolders/loadComics` |
| 评论 | — | `comic.loadComments/sendComment/likeComment/voteComment` |

---

## 8. 类型对照（核心运行时类型）

| VeneraNext 类型 | 构造方式 | 主要字段 |
|-----------------|----------|----------|
| `Comic` | `new Comic({id, title, subTitle, cover, tags, description})` | 列表展示用 |
| `ComicDetails` | `new ComicDetails({title, cover, description, tags, chapters, recommend, updateTime})` | 详情页用 |
| `Chapter` | 隐含在 `chapters` Map 中 | key=epId, value=标题 |
| `ImageLoadingConfig` | 对象字面量 `{url, method, headers, onResponse, modifyImage, onLoadFailed}` | 图片加载配置 |
| `HtmlDocument` | `new HtmlDocument(htmlString)` | `querySelector`/`querySelectorAll`/`text`/`attributes` |
| `PageJumpTarget` | `new PageJumpTarget({page, attributes})` | 标签点击跳转 |

---

## 9. 常见 Cimoc 解析模式 → VeneraNext 写法

| Cimoc 模式 | VeneraNext 对应写法 |
|------------|---------------------|
| `parseImageList: "#imgsec img.calwh"` | `doc.querySelectorAll('#imgsec img.calwh').map(e => e.attributes['src'])` |
| `parseImageList: "var z_img='(.*?)';"` (JS 正则提取) | `html.match(/var z_img='(.*?)';/)[1]` 然后 split/处理 |
| `parseImageList: "$function getImgList(){...}"` (内嵌 JS 函数) | 在 `loadEp` 中直接用 JS 实现同等逻辑（QuickJS 支持 eval 但不推荐） |
| `searchInfoCid: "a"` + `parseChapterPath: ""` | 解析 `a.attributes['href']`，`split('/').pop()` 作为 id |
| `serverUrl` 为数组 | `settings` 里做 select，运行时 `this.loadSetting('serverUrl')` 选中项 |

---

## 10. 版本兼容字段

| 字段 | 说明 |
|------|------|
| `minAppVersion` | 建议 `1.6.0`（含 `ImageLoadingConfig`、`compute`、动态分类等新特性） |
| `enableTagsTranslate` | 是否启用标签翻译（默认 false） |
| `idMatch` | 正则，用于从用户输入/分享链接提取 comicId |
| `link.domains` + `link.linkToId` | 支持从浏览器分享链接直接打开漫画 |

---

## 11. 典型迁移步骤（Checklist）

1. **新建类** `extends ComicSource`，填 `name/key/version/minAppVersion/url`
2. **设置 `settings`**：域名、CDN、图片质量、语言等用户可调参数
3. **实现 `baseUrl` getter** 读取 settings 动态拼接
4. **实现 `headers` getter** 含 UA、Referer、签名、Cookie
5. **编写 `parseComic` / `parseJsonComic` 复用函数**
6. **实现 `explore`**（可选，首页推荐）
7. **实现 `category` + `categoryComics`**（分类页）
8. **实现 `search.load`**（搜索）
9. **实现 `comic.loadInfo`**（详情+章节列表）
10. **实现 `comic.loadEp` / `onImageLoad`**（图片）
11. **如需登录/收藏** 实现 `account` / `favorites`
12. **添加 `translation.zh_CN`** 本地化设置项文案
13. **自测**：搜索→详情→章节→图片全链路跑通

---

## 12. 常见坑位提醒

| 坑位 | 说明 | 规避 |
|------|------|------|
| **QuickJS 无 DOM** | 不能用 `document`/`window`/`$`/jQuery | 全用 `HtmlDocument` + CSS 选择器 |
| **异步必须 `await`** | `Network.get` 返回 Promise | 所有网络请求、解析均 `async/await` |
| **字符编码** | 部分站点 GBK/Big5 | `Convert.decodeGbk(await Network.fetchBytes(...).body)` |
| **图片防盗链** | 直接返回 URL 会 403 | 必须实现 `onImageLoad` 带 Referer/headers |
| **章节列表倒序/正序** | 站点不一 | 统一按「正序（第1话在前）」存入 Map，`epId` 为索引字符串 |
| **key 一旦发布不可改** | 关联收藏/历史/缓存 | 先定 key 再动笔，建议 `domain_source` 格式如 `copy_manga` |
| **相对路径补全** | 封面/图片可能是相对路径 | `new URL(relativeUrl, this.baseUrl).href` 或手动拼接 |
| **分页参数** | Cimoc `%d` 从 1 开始 | VeneraNext `page` 也是 1-based，直接透传 |

---

> 本表基于 VeneraNext v1.15+ / QuickJS 运行时。如官方 API 更新，请以 `doc/api/js.en.md` 为准。