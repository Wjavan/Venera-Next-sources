/**
 * Komiic - VeneraNext JS 图源
 *
 * 移植自 Cimoc JSON 配置 (KOMIIC)
 * 站点: https://komiic.com
 * 验证时间: 2026-09-19 (HTTP 200)
 *
 * 结构说明: 站点使用 Next.js SSR, HTML 中嵌入 __NEXT_DATA__ JSON,
 * 优先从 JSON 提取数据, 降级到 HTML 解析。
 */

class Komiic extends ComicSource {
    name = "Komiic";
    key = "komiic";
    version = "1.0.0";
    minAppVersion = "1.6.0";
    url = "https://cdn.jsdelivr.net/gh/yourname/venera-sources@main/komiic.js";

    settings = {
        domain: {
            title: "站点域名",
            type: "select",
            options: [
                { value: "https://komiic.com", text: "komiic.com" },
                { value: "https://www.komiic.com", text: "www.komiic.com" },
            ],
            default: "https://komiic.com",
        },
        image_domain: {
            title: "图片CDN",
            type: "select",
            options: [
                { value: "", text: "默认 (站方自动)" },
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
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    get headers() {
        return {
            "User-Agent": this.ua,
            "Referer": this.baseUrl + "/",
        };
    }

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
            title = e.querySelector("h3, h4, .title, .book-title") ?
                (e.querySelector("h3, h4, .title, .book-title").text.trim()) : (a ? a.text.trim() : "");

            let img = e.querySelector("img, mip-img");
            if (img) cover = img.attributes["src"] || img.attributes["data-src"] || "";

            let authorEl = e.querySelector(".author, .book-author");
            author = authorEl ? authorEl.text.trim() : "";

            let updateEl = e.querySelector(".update, .update-time, .latest-chapter");
            update = updateEl ? updateEl.text.trim() : "";
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

    /**
     * 尝试从 __NEXT_DATA__ 提取结构化数据
     */
    extractNextData(html) {
        let match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e) { /* fallback to HTML parsing */ }
        }
        return null;
    }

    search = {
        load: async (keyword, options, page) => {
            let searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(searchUrl, this.headers);
            if (res.status !== 200) {
                throw `搜索失败: HTTP ${res.status}`;
            }

            let html = res.body;
            let nextData = this.extractNextData(html);
            let comics = [];

            // 优先从 __NEXT_DATA__ 提取
            if (nextData && nextData.props && nextData.props.pageProps) {
                let props = nextData.props.pageProps;
                let items = props.items || props.comics || props.results || [];
                for (let item of items) {
                    let comic = {
                        id: item.id ? String(item.id) : (item.slug || item.path || ""),
                        title: item.name || item.title || "",
                        subTitle: item.author || "",
                        cover: item.cover || item.image || item.thumbnail || "",
                        tags: item.tags || item.categories || [],
                        description: item.description || item.summary || "",
                    };
                    if (comic.title && comic.id) {
                        comic.cover = this.fixUrl(comic.cover);
                        comics.push(comic);
                    }
                }
            }

            // 降级到 HTML 解析
            if (comics.length === 0) {
                let doc = new HtmlDocument(html);
                let items = doc.querySelectorAll(".comic-item, .search-item, .list-item, [data-comic-id]");
                for (let item of items) {
                    let comic = this.parseComic(item);
                    if (comic.title && comic.id) comics.push(comic);
                }
            }

            let maxPage = comics.length > 0 ? page + 1 : page;
            return { comics: comics, maxPage: maxPage };
        },
        optionList: [],
    };

    explore = [
        {
            title: "Komiic",
            type: "singlePageWithMultiPart",
            load: async () => {
                let res = await Network.get(this.baseUrl, this.headers);
                if (res.status !== 200) throw `首页加载失败: HTTP ${res.status}`;

                let html = res.body;
                let nextData = this.extractNextData(html);
                let parts = {};

                // 从 __NEXT_DATA__ 提取推荐数据
                if (nextData && nextData.props && nextData.props.pageProps) {
                    let props = nextData.props.pageProps;
                    // 尝试常见的推荐数据结构
                    let recommended = props.recommended || props.popular || props.latest || {};
                    for (let section of ["recommended", "popular", "latest", "trending", "top"]) {
                        let items = props[section];
                        if (items && Array.isArray(items) && items.length > 0) {
                            let sectionTitle = {
                                recommended: "推荐",
                                popular: "热门",
                                latest: "最新",
                                trending: "热门趋势",
                                top: "排行"
                            }[section] || section;
                            let comics = [];
                            for (let item of items) {
                                let comic = {
                                    id: item.id ? String(item.id) : (item.slug || item.path || ""),
                                    title: item.name || item.title || "",
                                    subTitle: item.author || "",
                                    cover: item.cover || item.image || item.thumbnail || "",
                                    tags: item.tags || [],
                                    description: item.description || "",
                                };
                                if (comic.title && comic.id) {
                                    comic.cover = this.fixUrl(comic.cover);
                                    comics.push(comic);
                                }
                            }
                            if (comics.length > 0) parts[sectionTitle] = comics;
                        }
                    }
                }

                // 降级到 HTML 解析
                if (Object.keys(parts).length === 0) {
                    let doc = new HtmlDocument(html);
                    let lists = doc.querySelectorAll(".comic-list, .recommend-list, .list");
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
                        if (comics.length > 0) parts[partTitle] = comics;
                    }
                    if (Object.keys(parts).length === 0) {
                        let allItems = doc.querySelectorAll(".comic-item, .list-item, .recommend-item");
                        let comics = [];
                        for (let item of allItems) {
                            let comic = this.parseComic(item);
                            if (comic.title) comics.push(comic);
                        }
                        if (comics.length > 0) parts["推荐"] = comics;
                    }
                }

                return parts;
            }
        }
    ];

    category = {
        title: "Komiic分类",
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
            if (param === "hot") url = `${this.baseUrl}/top`;
            else if (param === "new") url = `${this.baseUrl}/new`;
            else if (param === "complete") url = `${this.baseUrl}/complete`;
            else url = this.baseUrl;

            let res = await Network.get(url, this.headers);
            if (res.status !== 200) throw `分类加载失败: HTTP ${res.status}`;

            let html = res.body;
            let nextData = this.extractNextData(html);
            let comics = [];

            if (nextData && nextData.props && nextData.props.pageProps) {
                let props = nextData.props.pageProps;
                let items = props.items || props.comics || props.results || [];
                for (let item of items) {
                    let comic = {
                        id: item.id ? String(item.id) : (item.slug || item.path || ""),
                        title: item.name || item.title || "",
                        subTitle: item.author || "",
                        cover: item.cover || item.image || item.thumbnail || "",
                        tags: item.tags || [],
                        description: item.description || "",
                    };
                    if (comic.title && comic.id) {
                        comic.cover = this.fixUrl(comic.cover);
                        comics.push(comic);
                    }
                }
            }

            if (comics.length === 0) {
                let doc = new HtmlDocument(html);
                let items = doc.querySelectorAll(".comic-item, .search-item, .list-item, [data-comic-id]");
                for (let item of items) {
                    let comic = this.parseComic(item);
                    if (comic.title) comics.push(comic);
                }
            }

            return { comics: comics, maxPage: 1 };
        },
        optionList: [],
    };

    comic = {
        loadInfo: async (id) => {
            let comicUrl = `${this.baseUrl}/comic/${id}`;
            let res = await Network.get(comicUrl, this.headers);
            if (res.status !== 200) {
                comicUrl = `${this.baseUrl}/${id}`;
                res = await Network.get(comicUrl, this.headers);
                if (res.status !== 200) throw `详情加载失败: HTTP ${res.status}`;
            }

            let html = res.body;
            let nextData = this.extractNextData(html);

            let title = "", cover = "", intro = "", author = "", update = "", status = "";
            let chapters = new Map();
            let i = 0;

            // 优先从 __NEXT_DATA__ 提取
            if (nextData && nextData.props && nextData.props.pageProps) {
                let props = nextData.props.pageProps;
                let comic = props.comic || props.detail || props;

                title = comic.title || comic.name || "";
                cover = comic.cover || comic.image || "";
                intro = comic.description || comic.summary || comic.synopsis || "";
                author = comic.author || "";
                update = comic.lastChapterTitle || comic.lastUpdate || "";
                status = comic.status || "";

                cover = this.fixUrl(cover);

                let chapterList = comic.chapters || comic.volumes || [];
                // 处理 volumes 结构
                if (Array.isArray(chapterList) && chapterList.length > 0) {
                    if (chapterList[0].chapters && Array.isArray(chapterList[0].chapters)) {
                        for (let vol of chapterList) {
                            for (let ch of vol.chapters) {
                                let chTitle = ch.title || ch.name || `第${ch.number || i + 1}话`;
                                chapters.set(i.toString(), chTitle);
                                i++;
                            }
                        }
                    } else {
                        for (let ch of chapterList) {
                            let chTitle = ch.title || ch.name || `第${ch.number || i + 1}话`;
                            chapters.set(i.toString(), chTitle);
                            i++;
                        }
                    }
                }
            }

            // 降级到 HTML 解析
            if (!title) {
                let doc = new HtmlDocument(html);
                title = doc.querySelector("h1, .book-title h1") ?
                    (doc.querySelector("h1, .book-title h1").text.trim()) : "";
                let coverEl = doc.querySelector(".book-cover img, img.cover, .cover img");
                if (coverEl) cover = this.fixUrl(coverEl.attributes["src"] || coverEl.attributes["data-src"] || "");
                intro = doc.querySelector(".book-intro, .intro, .description") ?
                    doc.querySelector(".book-intro, .intro, .description").text.trim() : "";
                author = doc.querySelector(".author, .book-author") ?
                    doc.querySelector(".author, .book-author").text.trim() : "";
                update = doc.querySelector(".update, .update-time") ?
                    doc.querySelector(".update, .update-time").text.trim() : "";
                status = doc.querySelector(".status, .tag, .tag-status") ?
                    doc.querySelector(".status, .tag, .tag-status").text.trim() : "";

                let chapterSelectors = [
                    "ul.catalog-list > li > a",
                    "div.book-detail > ul > li > a",
                    "#chapter-list li a",
                    ".chapter-list li a",
                ];
                for (let sel of chapterSelectors) {
                    let doc2 = new HtmlDocument(html);
                    let chapterItems = doc2.querySelectorAll(sel);
                    if (chapterItems.length > 0) {
                        i = 0;
                        for (let a of chapterItems) {
                            let chTitle = a.text.trim();
                            if (chTitle) { chapters.set(i.toString(), chTitle); i++; }
                        }
                        break;
                    }
                }
            }

            let tags = {};
            if (author) tags["作者"] = [author];
            if (status) tags["状态"] = [status];

            return new ComicDetails({
                title, cover, description: intro,
                tags, chapters, recommend: [], updateTime: update,
            });
        },

        loadEp: async (comicId, epId) => {
            let chapterUrl = `${this.baseUrl}/read/${comicId}/${epId}`;
            let res = await Network.get(chapterUrl, this.headers);
            if (res.status !== 200) {
                chapterUrl = `${this.baseUrl}/comic/${comicId}/${epId}`;
                res = await Network.get(chapterUrl, this.headers);
                if (res.status !== 200) throw `章节加载失败: HTTP ${res.status}`;
            }

            let html = res.body;
            let images = [];

            // 尝试从 __NEXT_DATA__ 提取图片列表
            let nextData = this.extractNextData(html);
            if (nextData && nextData.props && nextData.props.pageProps) {
                let props = nextData.props.pageProps;
                let imageList = props.images || props.pages || props.imageList || [];
                if (Array.isArray(imageList)) {
                    for (let img of imageList) {
                        let imgStr = typeof img === "string" ? img : (img.url || img.src || "");
                        if (imgStr) images.push(this.fixUrl(imgStr));
                    }
                }
            }

            // 尝试从JS变量提取
            if (images.length === 0) {
                let cpMatch = html.match(/cp\s*=\s*["'](\[.*?\])/);
                if (cpMatch) {
                    try {
                        let imgs = JSON.parse(cpMatch[1].replace(/'/g, '"'));
                        for (let img of imgs) {
                            let imgStr = String(img);
                            if (imgStr.startsWith("/")) imgStr = this.fixUrl(imgStr);
                            images.push(imgStr);
                        }
                    } catch (e) { /* fallback */ }
                }
            }

            // HTML img 提取
            if (images.length === 0) {
                let doc = new HtmlDocument(html);
                let imgNodes = doc.querySelectorAll(".reader-area img, .chapter-img, #img-list img, .comic-contain img, .comic-page img");
                for (let img of imgNodes) {
                    let src = img.attributes["data-src"] || img.attributes["data-original"] || img.attributes["src"] || "";
                    if (src && !src.includes("data:image")) {
                        images.push(this.fixUrl(src));
                    }
                }
            }

            // 正则提取
            if (images.length === 0) {
                let imgRegex = html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)[^\s"'<>]*/gi);
                if (imgRegex) images = imgRegex.filter(u => !u.includes("logo") && !u.includes("icon"));
            }

            return { images };
        },

        onImageLoad: (url, comicId, epId) => {
            let imgHost = url.split("/")[2] || "";
            return {
                headers: {
                    "User-Agent": this.ua,
                    "Referer": `https://${imgHost}/`,
                },
            };
        },

        onThumbnailLoad: (url) => { return {}; },

        link: {
            domains: ["komiic.com", "www.komiic.com"],
            linkToId: (url) => {
                let match = url.match(/\/comic\/([\d\w-]+)/);
                if (!match) match = url.match(/\/([\d\w-]+)(?:\/\d+)?/);
                return match ? match[1] : null;
            }
        },

        idMatch: "^(\\d+|[\\w-]+)$",
        enableTagsTranslate: false,
    };

    translation = {
        "zh_CN": { "站点域名": "站点域名", "图片CDN": "图片CDN" },
        "zh_TW": {}, "en": {}
    };
}