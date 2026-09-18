/**
 * Venera Comic Source Template
 * 
 * Usage:
 * 1. Copy this file and rename to your source name (e.g., mysource.js)
 * 2. Modify the class name, name, key, version, url
 * 3. Implement the required methods
 * 4. Add to index.json
 * 
 * Reference: https://github.com/venera-app/venera-configs
 * API Docs: https://github.com/CyrilPeng/Venera-Next/blob/main/doc/api/comic_source.en.md
 */

class YourSourceName extends ComicSource {
    // Required: Display name
    name = ""

    // Required: Unique identifier (don't change after publishing)
    key = ""

    // Required: Extension version
    version = "1.0.0"

    // Required: Minimum app version
    minAppVersion = "1.6.0"

    // Optional: Update URL (jsdelivr CDN)
    url = ""

    /**
     * Optional: Initialization
     */
    init() {
        // Initialize settings, load cached data, etc.
    }

    // ============ Settings ============
    settings = {
        // Example settings
        domain: {
            title: "Domain",
            type: "select",
            options: [
                { value: "https://example.com", text: "example.com" }
            ],
            default: "https://example.com"
        }
    }

    // Dynamic base URL
    get baseUrl() {
        return this.loadSetting("domain") || this.settings.domain.default
    }

    // Common headers
    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
            "Referer": this.baseUrl + "/"
        }
    }

    // ============ Helper Methods ============
    fixUrl(url) {
        if (!url) return ""
        if (url.startsWith("http")) return url
        if (url.startsWith("//")) return "https:" + url
        return this.baseUrl.replace(/\/$/, "") + "/" + url.replace(/^\//, "")
    }

    parseComicItem(e) {
        let title = "", cover = "", author = "", update = "", id = "", href = ""
        try {
            let a = e.querySelector("a")
            href = a ? a.attributes["href"] : ""
            title = e.querySelector("h3, h4, .title, .book-title") ? 
                e.querySelector("h3, h4, .title, .book-title").text.trim() : (a ? a.text.trim() : "")
            let img = e.querySelector("img, mip-img")
            if (img) cover = img.attributes["src"] || img.attributes["data-src"] || ""
            let authorEl = e.querySelector(".author, .book-author")
            author = authorEl ? authorEl.text.trim() : ""
            let updateEl = e.querySelector(".update, .update-time")
            update = updateEl ? updateEl.text.trim() : ""
        } catch (ex) {}
        if (href) id = href.replace(/^\//, "").split("/").pop().replace(".html", "").replace(".htm", "")
        return { id, title, subTitle: author, cover: this.fixUrl(cover), tags: [], description: update }
    }

    // ============ Search ============
    search = {
        load: async (keyword, options, page) => {
            let url = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}&page=${page}`
            let res = await Network.get(url, this.headers)
            if (res.status !== 200) {
                url = `${this.baseUrl}/search/${encodeURIComponent(keyword)}/${page}`
                res = await Network.get(url, this.headers)
            }
            if (res.status !== 200) throw `Search failed: HTTP ${res.status}`
            let doc = new HtmlDocument(res.body)
            let items = doc.querySelectorAll(".comic-item, .search-item, .list-item, .comic-list li")
            let comics = []
            for (let item of items) {
                let c = this.parseComicItem(item)
                if (c.title && c.id) comics.push(c)
            }
            return { comics, maxPage: comics.length > 0 ? page + 1 : page }
        },
        optionList: []
    }

    // ============ Explore ============
    explore = [{
        title: "Home",
        type: "singlePageWithMultiPart",
        load: async () => {
            let res = await Network.get(this.baseUrl, this.headers)
            if (res.status !== 200) throw `Home load failed: HTTP ${res.status}`
            let doc = new HtmlDocument(res.body)
            let parts = {}
            for (let list of doc.querySelectorAll(".comic-list, .recommend-list, .list")) {
                let tEl = list.querySelector("h3, h2, .title, .more")
                let pt = tEl ? tEl.text.trim() : "推荐"
                let cs = []
                for (let i of list.querySelectorAll("li")) {
                    let c = this.parseComicItem(i)
                    if (c.title) cs.push(c)
                }
                if (cs.length > 0) parts[pt] = cs
            }
            if (Object.keys(parts).length === 0) {
                let cs = []
                for (let i of doc.querySelectorAll(".comic-item, .list-item")) {
                    let c = this.parseComicItem(i)
                    if (c.title) cs.push(c)
                }
                if (cs.length > 0) parts["推荐"] = cs
            }
            return parts
        }
    }]

    // ============ Category ============
    category = {
        title: "Categories",
        parts: [{
            name: "All",
            type: "fixed",
            categories: [
                { label: "Hot", target: { page: "category", attributes: { category: "热门", param: "hot" } } },
                { label: "New", target: { page: "category", attributes: { category: "最新", param: "new" } } },
                { label: "Completed", target: { page: "category", attributes: { category: "完结", param: "complete" } } }
            ]
        }],
        enableRankingPage: false
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            let url = param === "hot" ? `${this.baseUrl}/hot` :
                      param === "new" ? `${this.baseUrl}/update` :
                      param === "complete" ? `${this.baseUrl}/complete` : this.baseUrl
            let res = await Network.get(url, this.headers)
            if (res.status !== 200) throw `Category load failed: HTTP ${res.status}`
            let doc = new HtmlDocument(res.body)
            let cs = []
            for (let i of doc.querySelectorAll(".comic-item, .list-item, .comic-list li")) {
                let c = this.parseComicItem(i)
                if (c.title) cs.push(c)
            }
            return { comics: cs, maxPage: 1 }
        },
        optionList: []
    }

    // ============ Comic Detail ============
    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}/comic/${id}`, this.headers)
            if (res.status !== 200) {
                let r2 = await Network.get(`${this.baseUrl}/${id}`, this.headers)
                if (r2.status !== 200) throw `Detail load failed: HTTP ${r2.status}`
                res = r2
            }
            let doc = new HtmlDocument(res.body)
            let title = doc.querySelector("h1, .book-title h1") ? doc.querySelector("h1, .book-title h1").text.trim() : ""
            let cover = ""
            let coverEl = doc.querySelector(".book-cover img, img.cover")
            if (coverEl) cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || ""
            let intro = doc.querySelector(".book-intro, .intro, .description") ? doc.querySelector(".book-intro, .intro, .description").text.trim() : ""
            let author = doc.querySelector(".author, .book-author") ? doc.querySelector(".author, .book-author").text.trim() : ""
            let update = doc.querySelector(".update, .update-time") ? doc.querySelector(".update, .update-time").text.trim() : ""
            let status = doc.querySelector(".status, .tag") ? doc.querySelector(".status, .tag").text.trim() : ""

            let chapters = new Map()
            let i = 0
            for (let sel of ["ul.catalog-list > li > a", "#chapter-list li a", ".chapter-list li a"]) {
                let its = doc.querySelectorAll(sel)
                if (its.length > 0) {
                    for (let a of its) {
                        let t = a.text.trim()
                        if (t) { chapters.set(i.toString(), t); i++ }
                    }
                    break
                }
            }

            let tags = {}
            if (author) tags["作者"] = [author]
            return new ComicDetails({ title, cover: this.fixUrl(cover), description: intro, tags: { 作者: [author] }, chapters, recommend: [], updateTime: "" })
        },

        loadEp: async (comicId, epId) => {
            let res = await Network.get(`${this.baseUrl}/read/${comicId}_${epId}`, this.headers)
            if (res.status !== 200) throw `Chapter load failed: HTTP ${res.status}`
            let html = res.body, images = []
            let m = html.match(/cp\s*=\s*["'](\[.*?\])/);
            if (m) { try { for (let img of JSON.parse(m[1].replace(/'/g, '"'))) { let s = String(img); if (s.startsWith("/")) s = this.fixUrl(s); images.push(s) } } catch (e) {} }
            if (images.length === 0) {
                let doc = new HtmlDocument(res.body)
                for (let img of doc.querySelectorAll(".reader-area img, .chapter-img, #img-list img")) {
                    let src = img.attributes["data-src"] || img.attributes["data-original"] || img.attributes["src"] || ""
                    if (src && !src.includes("data:image")) images.push(this.fixUrl(src))
                }
            }
            return { images }
        },

        onImageLoad: (url) => ({ headers: { "Referer": `https://${url.split("/")[2] || ""}/` } }),
        onThumbnailLoad: (url) => ({}),
        link: { domains: ["example.com"], linkToId: (url) => { let m = url.match(/\/comic\/([\d\w-]+)/) || url.match(/\/([\d\w-]+)(?:_\d+)?\.?html?$/); return m ? m[1] : null } },
        idMatch: "^(\\d+|[\w-]+)$",
        enableTagsTranslate: false
    }

    translation = { "zh_CN": {}, "zh_TW": {}, "en": {} }
}
