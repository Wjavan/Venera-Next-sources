/**
 * 扑飞漫画 - VeneraNext JS 图源
 *
 * 移植自 Cimoc JSON 配置 (PUFEIMH)
 * 站点: http://m.pufei.cc
 * 验证时间: 2026-09-19 (HTTP 200)
 *
 * 反爬: 图片需要 Referer 防盗链
 */

class PufeiMH extends ComicSource {
    name = "扑飞漫画";
    key = "pufeimh";
    version = "1.0.0";
    minAppVersion = "1.6.0";
    url = "https://cdn.jsdelivr.net/gh/yourname/venera-sources@main/pufeimh.js";

    // ─── 域名配置 ────────────────────────────────────────────
    settings = {
        domain: {
            title: "站点域名",
            type: "select",
            options: [
                { value: "http://m.pufei.cc", text: "m.pufei.cc (移动端)" },
                { value: "http://www.pufei.cc", text: "www.pufei.cc (PC端)" },
            ],
            default: "http://m.pufei.cc",
        },
        image_domain: {
            title: "图片CDN",
            type: "select",
            options: [
                { value: "", text: "默认 (站方自动)" },
                { value: "http://res.img.tueqi.com/", text: "tueqi.com" },
                { value: "http://res.img.shengda0769.com/", text: "shengda0769.com" },
            ],
            default: "",
        },
        image_quality: {
            title: "图片质量",
            type: "select",
            options: [
                { value: "", text: "原图" },
                { value: "1024", text: "1024" },
            ],
            default: "",
        },
    };

    get baseUrl() {
        return this.loadSetting("domain") || this.settings.domain.default;
    }

    get imgServer() {
        return this.loadSetting("image_domain") || "";
    }

    get ua() {
        return "Mozilla/5.0 (Linux; Android 13; SM-S9080) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    }

    get headers() {
        return {
            "User-Agent": this.ua,
            "Referer": this.baseUrl + "/",
        };
    }

    // ─── 解析工具 ────────────────────────────────────────────
    parseComic(e) {
        let title = "";
        let cover = "";
        let author = "";
        let update = "";
        let id = "";
        let href = "";

        try {
            let a = e.querySelector("a");
            href = a ? a.attributes["href"] : "";
            title = e.querySelector("h3") ? e.querySelector("h3").text.trim() : (a ? a.text.trim() : "");
            let img = e.querySelector("img") || e.querySelector("mip-img");
            if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
            author = e.querySelector("dl > dd") ? e.querySelector("dl > dd").text.trim() : "";
            update = e.querySelector("dl:eq(4) > dd") ? e.querySelector("dl:eq(4) > dd").text.trim() : "";
        } catch (ex) { /* silent */ }

        if (href) {
            id = href.replace(/^\//, "").split("/").pop().replace(".html", "").replace(".htm", "");
        }

        return {
            id: id,
            title: title,
            subTitle: author,
            cover: this.fixUrl(cover),
            tags: [],
            description: update,
        };
    }

    fixUrl(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        if (url.startsWith("//")) return "https:" + url;
        return this.baseUrl.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }

    // ─── 搜索 ────────────────────────────────────────────────
    search = {
        load: async (keyword, options, page) => {
            // 扑飞搜索: 首页搜索表单提交到 /e/search/
            let searchUrl;
            if (page === 1) {
                searchUrl = `${this.baseUrl}/e/search/?searchget=1&tbname=mh&show=title,player,playadmin,bieming,pinyin,playadmin&tempid=4&keyboard=${encodeURIComponent(keyword)}`;
            } else {
                searchUrl = `${this.baseUrl}/e/search/?searchget=1&tbname=mh&show=title,player,playadmin,bieming,pinyin,playadmin&tempid=4&keyboard=${encodeURIComponent(keyword)}&page=${page}`;
            }

            let res = await Network.get(searchUrl, this.headers);
            if (res.status !== 200) {
                throw `搜索失败: HTTP ${res.status}`;
            }

            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll("#detail > li");
            let comics = [];
            for (let item of items) {
                let comic = this.parseComic(item);
                if (comic.title && comic.id) {
                    comics.push(comic);
                }
            }

            // 分页检测
            let maxPage = 1;
            let hasNext = doc.querySelector(".pagebox a[href*='page']") || doc.querySelector("a:contains('下一页')");
            if (hasNext && comics.length > 0) {
                maxPage = page + 1;
            } else {
                maxPage = page;
            }

            return { comics: comics, maxPage: maxPage };
        },

        optionList: [],
    };

    // ─── 探索页 (首页推荐) ──────────────────────────────────
    explore = [
        {
            title: "扑飞漫画",
            type: "singlePageWithMultiPart",
            load: async () => {
                let res = await Network.get(this.baseUrl, this.headers);
                if (res.status !== 200) {
                    throw `首页加载失败: HTTP ${res.status}`;
                }

                let doc = new HtmlDocument(res.body);
                let parts = {};

                // 尝试解析首页推荐区块
                let lists = doc.querySelectorAll("div.list > ul");
                let idx = 0;
                for (let list of lists) {
                    let titleEl = list.querySelector("h3, h2, .title, .more");
                    let partTitle = titleEl ? titleEl.text.trim() : `推荐${++idx}`;
                    let items = list.querySelectorAll("li");
                    let comics = [];
                    for (let item of items) {
                        let comic = this.parseComic(item);
                        if (comic.title) comics.push(comic);
                    }
                    if (comics.length > 0) {
                        parts[partTitle] = comics;
                    }
                }

                // 如果没有解析到列表，尝试通用选择器
                if (Object.keys(parts).length === 0) {
                    let allItems = doc.querySelectorAll("#detail > li, .comic_list li, .list li");
                    let comics = [];
                    for (let item of allItems) {
                        let comic = this.parseComic(item);
                        if (comic.title) comics.push(comic);
                    }
                    if (comics.length > 0) parts["推荐"] = comics;
                }

                return parts;
            }
        }
    ];

    // ─── 分类 ────────────────────────────────────────────────
    category = {
        title: "扑飞漫画分类",
        parts: [
            {
                name: "全部",
                type: "fixed",
                categories: [
                    { label: "热门", target: { page: "category", attributes: { category: "热门", param: "hot" } } },
                    { label: "最新", target: { page: "category", attributes: { category: "最新", param: "new" } } },
                    { label: "完结", target: { page: "category", attributes: { category: "完结", param: "complete" } } },
                ],
            }
        ],
        enableRankingPage: false,
    };

    categoryComics = {
        load: async (category, param, options, page) => {
            let url;
            if (param === "hot") {
                url = `${this.baseUrl}/top/`;
            } else if (param === "new") {
                url = `${this.baseUrl}/update/`;
            } else if (param === "complete") {
                url = `${this.baseUrl}/complete/`;
            } else {
                url = `${this.baseUrl}/`;
            }

            let res = await Network.get(url, this.headers);
            if (res.status !== 200) {
                throw `分类加载失败: HTTP ${res.status}`;
            }

            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll("#detail > li, .list li, div.comic_list li");
            let comics = [];
            for (let item of items) {
                let comic = this.parseComic(item);
                if (comic.title) comics.push(comic);
            }

            return { comics: comics, maxPage: 1 };
        },
        optionList: [],
    };

    // ─── 漫画详情 ────────────────────────────────────────────
    comic = {
        loadInfo: async (id) => {
            let comicUrl = `${this.baseUrl}/comic/${id}.html`;
            let res = await Network.get(comicUrl, this.headers);
            if (res.status !== 200) {
                // 尝试不带 .html
                comicUrl = `${this.baseUrl}/${id}`;
                res = await Network.get(comicUrl, this.headers);
                if (res.status !== 200) {
                    throw `详情加载失败: HTTP ${res.status}`;
                }
            }

            let doc = new HtmlDocument(res.body);

            let title = doc.querySelector("div.main-bar > h1, h1.title, .bookname h1") ?
                (doc.querySelector("div.main-bar > h1, h1.title, .bookname h1").text.trim()) : "";
            let cover = "";
            let coverEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > img, .book-cover img, img.cover");
            if (coverEl) cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";

            let intro = doc.querySelector("#bookIntro, .book-intro, .book_info .intro") ?
                doc.querySelector("#bookIntro, .book-intro, .book_info .intro").text.trim() : "";
            let author = doc.querySelector("div.book-detail > div.cont-list > dl:eq(3) > dd, .author") ?
                doc.querySelector("div.book-detail > div.cont-list > dl:eq(3) > dd, .author").text.trim() : "";
            let update = doc.querySelector("div.book-detail > div.cont-list > dl:eq(2) > dd, .update") ?
                doc.querySelector("div.book-detail > div.cont-list > dl:eq(2) > dd, .update").text.trim() : "";
            let status = doc.querySelector("div.book-detail > div.cont-list > div.thumb > i, .status, .tag") ?
                doc.querySelector("div.book-detail > div.cont-list > div.thumb > i, .status, .tag").text.trim() : "";

            cover = this.fixUrl(cover);

            // 章节列表
            let chapters = new Map();
            let i = 0;
            let chapterSelectors = [
                "#chapterList2 > ul > li > a",
                "div.book-detail > ul.catalog-list > li > a",
                "ul.catalog-list > li > a",
                "#chapter-list li a",
            ];
            for (let sel of chapterSelectors) {
                let chapterItems = doc.querySelectorAll(sel);
                if (chapterItems.length > 0) {
                    for (let a of chapterItems) {
                        let chTitle = a.text.trim();
                        if (chTitle) {
                            chapters.set(i.toString(), chTitle);
                            i++;
                        }
                    }
                    break;
                }
            }

            // 提取标签
            let tags = {};
            if (author) tags["作者"] = [author];
            if (status) tags["状态"] = [status];

            return new ComicDetails({
                title: title,
                cover: cover,
                description: intro,
                tags: tags,
                chapters: chapters,
                recommend: [],
                updateTime: update,
            });
        },

        // ─── 章节图片 ────────────────────────────────────────
        loadEp: async (comicId, epId) => {
            let chapterUrl = `${this.baseUrl}/read/${comicId}_${epId}.html`;
            let res = await Network.get(chapterUrl, this.headers);
            if (res.status !== 200) {
                // 尝试其他格式
                chapterUrl = `${this.baseUrl}/read/${comicId}-${epId}.html`;
                res = await Network.get(chapterUrl, this.headers);
                if (res.status !== 200) {
                    chapterUrl = `${this.baseUrl}/${comicId}_${epId}`;
                    res = await Network.get(chapterUrl, this.headers);
                    if (res.status !== 200) {
                        throw `章节加载失败: HTTP ${res.status}`;
                    }
                }
            }

            let images = [];
            let html = res.body;

            // 方式1: JS变量 cp="..." 提取
            let cpMatch = html.match(/cp\s*=\s*["'](\[.*?\])/);
            if (cpMatch) {
                try {
                    let imgs = JSON.parse(cpMatch[1].replace(/'/g, '"'));
                    for (let img of imgs) {
                        let imgStr = String(img);
                        if (imgStr.startsWith("/")) {
                            imgStr = this.fixUrl(imgStr);
                        }
                        images.push(imgStr);
                    }
                } catch (e) { /* fallback */ }
            }

            // 方式2: 从HTML img标签提取
            if (images.length === 0) {
                let doc = new HtmlDocument(html);
                let imgNodes = doc.querySelectorAll(".reader-area img, .chapter-img, #img-list img, .comic-contain img");
                for (let img of imgNodes) {
                    let src = img.attributes["data-src"] || img.attributes["data-original"] || img.attributes["src"] || "";
                    if (src && !src.includes("data:image")) {
                        images.push(this.fixUrl(src));
                    }
                }
            }

            // 方式3: 正则从HTML提取图片URL
            if (images.length === 0) {
                let imgRegex = html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)[^\s"'<>]*/gi);
                if (imgRegex) {
                    images = imgRegex.filter(u => !u.includes("logo") && !u.includes("icon"));
                }
            }

            // 拼接CDN前缀
            if (this.imgServer) {
                images = images.map(u => {
                    if (!u.startsWith("http")) {
                        return this.imgServer.replace(/\/$/, "") + "/" + u.replace(/^\//, "");
                    }
                    return u;
                });
            }

            return { images: images };
        },

        // ─── 图片加载配置 (防盗链) ──────────────────────────
        onImageLoad: (url, comicId, epId) => {
            let imgHeaders = {
                "User-Agent": this.ua,
                "Referer": `${this.baseUrl}/`,
            };
            // 如果CDN域名在settings里指定了，Referer用CDN的域名
            let imgHost = url.split("/")[2] || "";
            imgHeaders["Referer"] = `https://${imgHost}/`;

            return {
                headers: imgHeaders,
            };
        },

        onThumbnailLoad: (url) => {
            return {};
        },

        // ─── 链接支持 ────────────────────────────────────────
        link: {
            domains: ["pufei.cc", "m.pufei.cc", "www.pufei.cc"],
            linkToId: (url) => {
                let match = url.match(/\/(\d+)(?:_\d+)?\.?html?$/);
                return match ? match[1] : null;
            }
        },

        idMatch: "^(\\d+)$",

        enableTagsTranslate: false,
    };

    // ─── 本地化 ──────────────────────────────────────────────
    translation = {
        "zh_CN": {
            "站点域名": "站点域名",
            "图片CDN": "图片CDN",
            "图片质量": "图片质量",
        },
        "zh_TW": {},
        "en": {}
    };
}