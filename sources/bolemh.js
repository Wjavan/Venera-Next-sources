/**
 * 伯乐漫画 (BOLEMH) - VeneraNext JS 图源
 * 站点: https://bbboy.cc
 * 验证: 2026-09-19 HTTP 200
 */
class BoleMH extends ComicSource {
    name = "伯乐漫画";
    key = "bolemh";
    version = "1.0.0";
    minAppVersion = "1.6.0";
    url = "https://cdn.jsdelivr.net/gh/yourname/venera-sources@main/bolemh.js";

    settings = {
        domain: { title: "站点域名", type: "select", options: [{ value: "https://bbboy.cc" }], default: "https://bbboy.cc" },
    };
    get baseUrl() { return this.loadSetting("domain") || "https://bbboy.cc"; }
    get ua() { return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"; }
    get headers() { return { "User-Agent": this.ua, "Referer": this.baseUrl + "/" }; }

    parseComic(e) {
        let title = "", cover = "", author = "", update = "", id = "", href = "";
        try {
            let a = e.querySelector("a");
            href = a ? a.attributes["href"] : "";
            title = e.querySelector("h3, h4, .title, .book-title") ? (e.querySelector("h3, h4, .title, .book-title").text.trim()) : (a ? a.text.trim() : "");
            let img = e.querySelector("img, mip-img");
            if (img) cover = img.attributes["src"] || img.attributes["data-src"] || "";
            let authorEl = e.querySelector(".author, .book-author");
            author = authorEl ? authorEl.text.trim() : "";
            let updateEl = e.querySelector(".update, .update-time");
            update = updateEl ? updateEl.text.trim() : "";
        } catch (ex) {}
        if (href) id = href.replace(/^\//, "").split("/").pop().replace(".html", "").replace(".htm", "");
        return { id, title, subTitle: author, cover: this.fixUrl(cover), tags: [], description: update };
    }
    fixUrl(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        if (url.startsWith("//")) return "https:" + url;
        return this.baseUrl.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }

    search = {
        load: async (keyword, options, page) => {
            let url = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(url, this.headers);
            if (res.status !== 200) throw `搜索失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll(".comic-item, .search-item, .list-item, .comic-list li, .search-result li");
            let comics = [];
            for (let item of items) { let c = this.parseComic(item); if (c.title && c.id) comics.push(c); }
            return { comics, maxPage: comics.length > 0 ? page + 1 : page };
        },
        optionList: [],
    };

    explore = [{ title: "伯乐漫画", type: "singlePageWithMultiPart", load: async () => {
        let res = await Network.get(this.baseUrl, this.headers);
        if (res.status !== 200) throw `首页加载失败: HTTP ${res.status}`;
        let doc = new HtmlDocument(res.body);
        let parts = {};
        let lists = doc.querySelectorAll(".comic-list, .recommend-list, .list");
        let idx = 0;
        for (let list of lists) {
            let tEl = list.querySelector("h3, h2, .title, .more");
            let pt = tEl ? tEl.text.trim() : `推荐${++idx}`;
            let cs = []; for (let i of list.querySelectorAll("li")) { let c = this.parseComic(i); if (c.title) cs.push(c); }
            if (cs.length > 0) parts[pt] = cs;
        }
        if (Object.keys(parts).length === 0) {
            let cs = []; for (let i of doc.querySelectorAll(".comic-item, .list-item, .recommend-item")) { let c = this.parseComic(i); if (c.title) cs.push(c); }
            if (cs.length > 0) parts["推荐"] = cs;
        }
        return parts;
    }}];

    category = { title: "伯乐漫画分类", parts: [{ name: "全部", type: "fixed", categories: [
        { label: "热门", target: { page: "category", attributes: { category: "热门", param: "hot" } } },
        { label: "最新", target: { page: "category", attributes: { category: "最新", param: "new" } } },
        { label: "完结", target: { page: "category", attributes: { category: "完结", param: "complete" } } },
    ] }], enableRankingPage: false };

    categoryComics = { load: async (category, param, options, page) => {
        let url = param === "hot" ? `${this.baseUrl}/top` : param === "new" ? `${this.baseUrl}/update` : param === "complete" ? `${this.baseUrl}/complete` : this.baseUrl;
        let res = await Network.get(url, this.headers); if (res.status !== 200) throw `分类加载失败: HTTP ${res.status}`;
        let doc = new HtmlDocument(res.body); let cs = [];
        for (let i of doc.querySelectorAll(".comic-item, .list-item, .recommend-item, .comic-list li")) { let c = this.parseComic(i); if (c.title) cs.push(c); }
        return { comics: cs, maxPage: 1 };
    }, optionList: [] };

    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}/comic/${id}`, this.headers);
            if (res.status !== 200) res = await Network.get(`${this.baseUrl}/${id}`, this.headers);
            if (res.status !== 200) throw `详情加载失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let title = doc.querySelector("h1, .book-title h1") ? (doc.querySelector("h1, .book-title h1").text.trim()) : "";
            let cover = "", coverEl = doc.querySelector(".book-cover img, img.cover");
            if (coverEl) cover = this.fixUrl(coverEl.attributes["src"] || coverEl.attributes["data-src"] || "");
            let intro = doc.querySelector(".book-intro, .intro, .description") ? (doc.querySelector(".book-intro, .intro, .description").text.trim()) : "";
            let author = doc.querySelector(".author, .book-author") ? (doc.querySelector(".author, .book-author").text.trim()) : "";
            let update = doc.querySelector(".update, .update-time") ? (doc.querySelector(".update, .update-time").text.trim()) : "";
            let status = doc.querySelector(".status, .tag") ? (doc.querySelector(".status, .tag").text.trim()) : "";
            let chapters = new Map(); let i = 0;
            for (let sel of ["ul.catalog-list > li > a", "div.book-detail > ul > li > a", "#chapter-list li a"]) {
                let its = doc.querySelectorAll(sel);
                if (its.length > 0) { for (let a of its) { let t = a.text.trim(); if (t) { chapters.set(i.toString(), t); i++; } } break; }
            }
            let tags = {}; if (author) tags["作者"] = [author]; if (status) tags["状态"] = [status];
            return new ComicDetails({ title, cover, description: intro, tags, chapters, recommend: [], updateTime: update });
        },
        loadEp: async (comicId, epId) => {
            let res = await Network.get(`${this.baseUrl}/read/${comicId}_${epId}`, this.headers);
            if (res.status !== 200) res = await Network.get(`${this.baseUrl}/${comicId}_${epId}`, this.headers);
            if (res.status !== 200) throw `章节加载失败: HTTP ${res.status}`;
            let html = res.body, images = [];
            let m = html.match(/cp\s*=\s*["'](\[.*?\])/);
            if (m) { try { for (let img of JSON.parse(m[1].replace(/'/g, '"'))) { let s = String(img); if (s.startsWith("/")) s = this.fixUrl(s); images.push(s); } } catch (e) {} }
            if (images.length === 0) {
                let doc = new HtmlDocument(html);
                for (let img of doc.querySelectorAll(".reader-area img, .chapter-img, #img-list img, .comic-contain img")) {
                    let src = img.attributes["data-src"] || img.attributes["data-original"] || img.attributes["src"] || "";
                    if (src && !src.includes("data:image")) images.push(this.fixUrl(src));
                }
            }
            if (images.length === 0) { let m2 = html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)[^\s"'<>]*/gi); if (m2) images = m2.filter(u => !u.includes("logo") && !u.includes("icon")); }
            return { images };
        },
        onImageLoad: (url, comicId, epId) => { return { headers: { "User-Agent": this.ua, "Referer": `https://${url.split("/")[2] || ""}/` } }; },
        onThumbnailLoad: (url) => { return {}; },
        link: { domains: ["bbboy.cc"], linkToId: (url) => { let m = url.match(/\/comic\/([\d\w-]+)/) || url.match(/\/([\d\w-]+)(?:_\d+)?\.?html?$/); return m ? m[1] : null; } },
        idMatch: "^(\\d+|[\\w-]+)$",
        enableTagsTranslate: false,
    };
    translation = { "zh_CN": {}, "zh_TW": {}, "en": {} };
}