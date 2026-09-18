/**
 * 漫画160 - VeneraNext JS 图源
 * 站点: www.mh160mh.com
 * 语言: zh
 */

class Mh160Source extends ComicSource {
    name = "漫画160"
    key = "mh160"
    version = "1.0.0"
    minAppVersion = "1.6.0"
    url = "https://cdn.jsdelivr.net/gh/yourname/venera-sources@main/mh160.js"

    settings = {
        domain: {
            title: "站点域名",
            type: "select",
            options: [
                { value: "www.mh160mh.com", text: "www.mh160mh.com" }
            ],
            default: "www.mh160mh.com"
        },
        language: {
            title: "语言",
            type: "select",
            options: [{ value: "cn", text: "简体" }, { value: "tw", text: "繁體" }],
            default: "zh"
        }
    }

    get baseUrl() {
        return this.loadSetting("domain") || "https://www.mh160mh.com"
    }

    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Referer": this.baseUrl + "/"
        }
    }

    fixUrl(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        if (url.startsWith("//")) return "https:" + url;
        return this.baseUrl.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }

    parseComicItem(e) {
        let title = "", cover = "", author = "", update = "", id = "", href = "";
        try {
            let a = e.querySelector("a");
            href = a ? a.attributes["href"] : "";
            title = e.querySelector("h3, h4, .title, .book-title, .comic-title") ?
                e.querySelector("h3, h4, .title, .book-title, .comic-title").text.trim() :
                (a ? a.text.trim() : "");
            let img = e.querySelector("img, mip-img");
            if (img) cover = img.attributes["src"] || img.attributes["data-src"] || img.attributes["data-original"] || "";
            let authorEl = e.querySelector(".author, .book-author, .comic-author");
            author = authorEl ? authorEl.text.trim() : "";
            let updateEl = e.querySelector(".update, .update-time, .latest-chapter, .chapter");
            update = updateEl ? updateEl.text.trim() : "";
        } catch (ex) {}
        if (href) id = href.replace(/^\//, "").split("/").pop().replace(".html", "").replace(".htm", "");
        return { id, title, subTitle: author, cover: this.fixUrl(cover), tags: [], description: update };
    }

    search = {
        load: async (keyword, options, page) => {
            let searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(searchUrl, this.headers);
            if (res.status !== 200) {
                searchUrl = `${this.baseUrl}/search/${encodeURIComponent(keyword)}/${page}`;
                res = await Network.get(searchUrl, this.headers);
            }
            if (res.status !== 200) throw `搜索失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let items = doc.querySelectorAll(".comic-item, .search-item, .list-item, .comic-list li, .search-result li, .book-item, .manga-item");
            let comics = [];
            for (let item of items) {
                let comic = this.parseComicItem(item);
                if (comic.title && comic.id) comics.push(comic);
            }
            return { comics, maxPage: comics.length > 0 ? page + 1 : page };
        },
        optionList: []
    }

    explore = [{
        title: "漫画160",
        type: "singlePageWithMultiPart",
        load: async () => {
            let res = await Network.get(this.baseUrl, this.headers);
            if (res.status !== 200) throw `首页加载失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let parts = {};
            for (let list of doc.querySelectorAll(".comic-list, .recommend-list, .list, .hot-list, .new-list, .rank-list")) {
                let tEl = list.querySelector("h3, h2, .title, .more, .section-title");
                let pt = tEl ? tEl.text.trim() : "推荐";
                let cs = [];
                for (let i of list.querySelectorAll("li, .item")) {
                    let c = this.parseComicItem(i);
                    if (c.title) cs.push(c);
                }
                if (cs.length > 0) parts[pt] = cs;
            }
            if (Object.keys(parts).length === 0) {
                let cs = [];
                for (let i of doc.querySelectorAll(".comic-item, .list-item, .recommend-item, .book-item, .manga-item")) {
                    let c = this.parseComicItem(i);
                    if (c.title) cs.push(c);
                }
                if (cs.length > 0) parts["推荐"] = cs;
            }
            return parts;
        }
    }]

    category = {
        title: "漫画160分类",
        parts: [{
            name: "全部",
            type: "fixed",
            categories: [
                { label: "热门", target: { page: "category", attributes: { category: "热门", param: "hot" } } },
                { label: "最新", target: { page: "category", attributes: { category: "最新", param: "new" } } },
                { label: "完结", target: { page: "category", attributes: { category: "完结", param: "complete" } } }
            ]
        }],
        enableRankingPage: false
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            let url = param === "hot" ? `${this.baseUrl}/hot` :
                      param === "new" ? `${this.baseUrl}/update` :
                      param === "complete" ? `${this.baseUrl}/complete` : this.baseUrl;
            let res = await Network.get(url, this.headers);
            if (res.status !== 200) throw `分类加载失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let cs = [];
            for (let i of doc.querySelectorAll(".comic-item, .list-item, .recommend-item, .comic-list li, .book-item")) {
                let c = this.parseComicItem(i);
                if (c.title) cs.push(c);
            }
            return { comics: cs, maxPage: 1 };
        },
        optionList: []
    }

    comic = {
        loadInfo: async (id) => {
            let comicUrl = `${this.baseUrl}/comic/${id}`;
            let res = await Network.get(comicUrl, this.headers);
            if (res.status !== 200) {
                comicUrl = `${this.baseUrl}/${id}`;
                res = await Network.get(comicUrl, this.headers);
            }
            if (res.status !== 200) throw `详情加载失败: HTTP ${res.status}`;
            let doc = new HtmlDocument(res.body);
            let title = doc.querySelector("h1, .book-title h1, .comic-title, .detail-title") ?
                doc.querySelector("h1, .book-title h1, .comic-title, .detail-title").text.trim() : "";
            let cover = "";
            let coverEl = doc.querySelector(".book-cover img, img.cover, .cover img, .detail-cover img, .comic-cover img");
            if (coverEl) cover = this.fixUrl(coverEl.attributes["src"] || coverEl.attributes["data-src"] || coverEl.attributes["data-original"] || "");
            let intro = doc.querySelector(".book-intro, .intro, .description, .comic-desc, .detail-desc") ?
                doc.querySelector(".book-intro, .intro, .description, .comic-desc, .detail-desc").text.trim() : "";
            let author = doc.querySelector(".author, .book-author, .comic-author, .detail-author") ?
                doc.querySelector(".author, .book-author, .comic-author, .detail-author").text.trim() : "";
            let update = doc.querySelector(".update, .update-time, .latest-chapter, .detail-update") ?
                doc.querySelector(".update, .update-time, .latest-chapter, .detail-update").text.trim() : "";
            let status = doc.querySelector(".status, .tag, .tag-status, .detail-status") ?
                doc.querySelector(".status, .tag, .tag-status, .detail-status").text.trim() : "";

            let chapters = new Map();
            let i = 0;
            for (let sel of ["ul.catalog-list > li > a", "div.book-detail > ul > li > a", "#chapter-list li a", ".chapter-list li a", ".chapters li a", "ul.chapters li a"]) {
                let its = doc.querySelectorAll(sel);
                if (its.length > 0) {
                    for (let a of its) {
                        let t = a.text.trim();
                        if (t) { chapters.set(i.toString(), t); i++; }
                    }
                    break;
                }
            }

            let tags = {};
            if (author) tags["作者"] = [author];
            if (status) tags["状态"] = [status];
            return new ComicDetails({ title, cover, description: intro, tags, chapters, recommend: [], updateTime: update });
        },

        loadEp: async (comicId, epId) => {
            let chapterUrl = `${this.baseUrl}/read/${comicId}_${epId}`;
            let res = await Network.get(chapterUrl, this.headers);
            if (res.status !== 200) {
                chapterUrl = `${this.baseUrl}/${comicId}_${epId}`;
                res = await Network.get(chapterUrl, this.headers);
            }
            if (res.status !== 200) throw `章节加载失败: HTTP ${res.status}`;
            let html = res.body, images = [];

            let m = html.match(/cp\s*=\s*["'](\[.*?\])/);
            if (m) {
                try { for (let img of JSON.parse(m[1].replace(/'/g, '"'))) { let s = String(img); if (s.startsWith("/")) s = this.fixUrl(s); images.push(s); } } catch (e) {}
            }

            if (images.length === 0) {
                let doc = new HtmlDocument(html);
                for (let img of doc.querySelectorAll(".reader-area img, .chapter-img, #img-list img, .comic-contain img, .comic-page img, .page img")) {
                    let src = img.attributes["data-src"] || img.attributes["data-original"] || img.attributes["src"] || "";
                    if (src && !src.includes("data:image")) images.push(this.fixUrl(src));
                }
            }

            if (images.length === 0) {
                let m2 = html.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)[^\s"'<>]*/gi);
                if (m2) images = m2.filter(u => !u.includes("logo") && !u.includes("icon") && !u.includes("avatar"));
            }
            return { images };
        },

        onImageLoad: (url, comicId, epId) => {
            return { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", "Referer": `https://${url.split("/")[2] || ""}/` } };
        },
        onThumbnailLoad: (url) => { return {}; },

        link: {
            domains: ["www.mh160mh.com"],
            linkToId: (url) => {
                let m = url.match(/\/comic\/([\d\w-]+)/) || url.match(/\/([\d\w-]+)(?:_\d+)?\.?html?$/);
                return m ? m[1] : null;
            }
        },
        idMatch: "^(\\d+|[\\w-]+)$",
        enableTagsTranslate: false
    }

    translation = {
        "zh_CN": { "站点域名": "站点域名", "语言": "语言" },
        "zh_TW": {},
        "en": {}
    }
}