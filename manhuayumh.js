/**
 * 漫画鱼 - VeneraNext JS 图源
 *
 * 移植自 Cimoc JSON 配置 (MANHUAYU)
 * 站点: https://www.manhuayu88.com
 * 验证时间: 2026-09-19 (HTTP 200)
 */

class ManhuayuMH extends ComicSource {
    name = "漫画鱼";
    key = "manhuayumh";
    version = "1.0.0";
    minAppVersion = "1.6.0";
    url = "https://cdn.jsdelivr.net/gh/yourname/venera-sources@main/manhuayumh.js";

    settings = {
        domain: {
            title: "站点域名",
            type: "select",
            options: [
                { value: "https://www.manhuayu88.com", text: "manhuayu88.com" },
            ],
            default: "https://www.manhuayu88.com",
        },
        image_domain: {
            title: "图片CDN",
            type: "select",
            options: [
                { value: "", text: "默认 (站方自动)" },
                { value: "https://cdn.manhuayu88.com/", text: "cdn.manhuayu88.com" },
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

            let authorEl = e.querySelector(".author, .book-author, .author-name");
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

    search = {
        load: async (keyword, options, page) => {
            let searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(searchUrl, this.headers);
            if (res.status !== 200) {
                searchUrl = `${this.baseUrl}/search/${encodeURIComponent(keyword)}/${page}`;
                res = await Network.get(searchUrl, this.headers);
                if (res.status !== 200) {
                    throw `搜索失败: HTTP ${res.status}`;
                }
            }

            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll("ul.comic-list li, .search-result li, .list-item, .comic-item");
            let comics = [];
            for (let item of items) {
                let comic = this.parseComic(item);
                if (comic.title && comic.id) comics.push(comic);
            }

            let maxPage = comics.length > 0 ? page + 1 : page;
            return { comics: comics, maxPage: maxPage };
        },
        optionList: [],
    };

    explore = [
        {
            title: "漫画鱼",
            type: "singlePageWithMultiPart",
            load: async () => {
                let res = await Network.get(this.baseUrl, this.headers);
                if (res.status !== 200) throw `首页加载失败: HTTP ${res.status}`;

                let doc = new HtmlDocument(res.body);
                let parts = {};

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

                return parts;
            }
        }
    ];

    category = {
        title: "漫画鱼分类",
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
            else if (param === "new") url = `${this.baseUrl}/update`;
            else if (param === "complete") url = `${this.baseUrl}/complete`;
            else url = this.baseUrl;

            let res = await Network.get(url, this.headers);
            if (res.status !== 200) throw `分类加载失败: HTTP ${res.status}`;

            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll("ul.comic-list li, .search-result li, .list-item, .comic-item");
            let comics = [];
            for (let item of items) {
                let comic = this.parseComic(item);
                if (comic.title) comics.push(comic);
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

            let doc = new HtmlDocument(res.body);

            let title = doc.querySelector("h1, .book-title h1") ?
                (doc.querySelector("h1, .book-title h1").text.trim()) : "";
            let cover = "";
            let coverEl = doc.querySelector(".book-cover img, img.cover, .cover img");
            if (coverEl) cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";

            let intro = doc.querySelector(".book-intro, .intro, .description") ?
                doc.querySelector(".book-intro, .intro, .description").text.trim() : "";
            let author = doc.querySelector(".author, .book-author") ?
                doc.querySelector(".author, .book-author").text.trim() : "";
            let update = doc.querySelector(".update, .update-time") ?
                doc.querySelector(".update, .update-time").text.trim() : "";
            let status = doc.querySelector(".status, .tag, .tag-status") ?
                doc.querySelector(".status, .tag, .tag-status").text.trim() : "";

            cover = this.fixUrl(cover);

            let chapters = new Map();
            let i = 0;
            let chapterSelectors = [
                "ul.catalog-list > li > a",
                "div.book-detail > ul > li > a",
                "#chapter-list li a",
                ".chapter-list li a",
            ];
            for (let sel of chapterSelectors) {
                let chapterItems = doc.querySelectorAll(sel);
                if (chapterItems.length > 0) {
                    for (let a of chapterItems) {
                        let chTitle = a.text.trim();
                        if (chTitle) { chapters.set(i.toString(), chTitle); i++; }
                    }
                    break;
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
            let chapterUrl = `${this.baseUrl}/read/${comicId}_${epId}`;
            let res = await Network.get(chapterUrl, this.headers);
            if (res.status !== 200) {
                chapterUrl = `${this.baseUrl}/${comicId}_${epId}`;
                res = await Network.get(chapterUrl, this.headers);
                if (res.status !== 200) throw `章节加载失败: HTTP ${res.status}`;
            }

            let images = [];
            let html = res.body;

            // 尝试从JS变量提取
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

            // HTML img 提取
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
            domains: ["manhuayu88.com", "www.manhuayu88.com"],
            linkToId: (url) => {
                let match = url.match(/\/([\d\w-]+)(?:_\d+)?\.?html?$/);
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