/** @type {import('./_venera_.js')} */
class Haoduoman extends ComicSource {
  name = "好多漫画";
  key = "haoduoman";
  version = "1.0.0";
  minAppVersion = "1.6.0";
  url = "https://cdn.jsdelivr.net/gh/Wjavan/venera-next-sources@main/haoduoman.js";

  settings = {
    domains: {
      title: "选择域名",
      type: "select",
      options: [
        { value: "https://www.haoduoman.com", text: "haoduoman.com (主站)" },
        { value: "https://m.haoduoman.com", text: "m.haoduoman.com (移动端)" }
      ],
      default: "https://www.haoduoman.com"
    }
  };

  get baseUrl() {
    return this.loadSetting("domains") || "https://www.haoduoman.com";
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36",
      "Referer": this.baseUrl + "/"
    };
  }

  parseComic(item) {
    const link = item.querySelector("a");
    if (!link) return null;
    const href = link.attributes.href;
    const id = href.split("/").pop().replace(".html", "");
    const title = item.querySelector("h3, .title, .book-title")?.text?.trim() || link.text.trim();
    const cover = item.querySelector("img")?.attributes?.["data-src"] || item.querySelector("img")?.attributes?.src;
    const author = item.querySelector(".author, .book-author, .comic-author")?.text?.trim() || "";
    const update = item.querySelector(".update, .update-time, .chapter, .latest")?.text?.trim() || "";
    if (!id || !title) return null;
    return new Comic({
      id, title,
      subTitle: author,
      cover: this.fixUrl(cover),
      tags: [],
      description: update
    });
  }

  fixUrl(u) {
    if (!u) return "";
    if (u.startsWith("http")) return u;
    if (u.startsWith("//")) return "https:" + u;
    return this.baseUrl.replace(/\/$/, "") + "/" + u.replace(/^\//, "");
  }

  explore = [{
    title: "好多漫画",
    type: "multiPartPage",
    load: async (page) => {
      let url = page === 1 ? this.baseUrl : `${this.baseUrl}/page/${page}/`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      const result = {};
      let items = doc.querySelectorAll(".comic-list .item, .book-list li, .comic-item, .list-item");
      if (items.length > 0) {
        result["推荐漫画"] = items.map(e => this.parseComic(e)).filter(Boolean);
      }
      return result;
    }
  }];

  category = null;

  search = {
    load: async (keyword, options, page) => {
      let url = `${this.baseUrl}/search/${encodeURIComponent(keyword)}/${page}/`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `搜索失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let items = doc.querySelectorAll(".search-result .item, .book-list li, .comic-item");
      return {
        comics: items.map(e => this.parseComic(e)).filter(Boolean),
        maxPage: page + 1
      };
    }
  };

  comic = {
    loadInfo: async (id) => {
      let url = `${this.baseUrl}/comic/${id}/`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `详情加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      
      let title = doc.querySelector(".book-title, h1, .detail-title")?.text?.trim() || id;
      let cover = doc.querySelector(".book-cover img, .detail-cover img, .comic-cover img")?.attributes?.src || "";
      let author = doc.querySelector(".book-author, .author, .comic-author")?.text?.trim() || "";
      let description = doc.querySelector(".book-intro, .intro, .description, .comic-desc")?.text?.trim() || "";
      let update = doc.querySelector(".last-chapter, .update-chapter, .latest-chapter")?.text?.trim() || "";
      let status = doc.querySelector(".book-status, .status, .comic-status")?.text?.trim() || "";
      
      let chapters = new Map();
      let chapterLinks = doc.querySelectorAll("#chapter-list a, .chapter-list a, .catalog a, .comic-chapters a");
      let i = 0;
      for (let link of chapterLinks) {
        let href = link.attributes.href;
        let cid = href.split("/").pop().replace(".html", "");
        let ctitle = link.text.trim();
        if (cid && ctitle) {
          chapters.set(i.toString(), ctitle);
          i++;
        }
      }

      return new ComicDetails({
        title, cover: this.fixUrl(cover),
        description, tags: { 作者: [author], 状态: [status], 更新: [update] },
        chapters, updateTime: update
      });
    },

    loadEp: async (comicId, epId) => {
      let url = `${this.baseUrl}/comic/${comicId}/${epId}.html`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `章节加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      
      let images = [];
      let imgNodes = doc.querySelectorAll("#chapter-images img, .chapter-content img, .read-content img, .comic-page img");
      for (let img of imgNodes) {
        let src = img.attributes["data-src"] || img.attributes["src"] || "";
        if (src) images.push(this.fixUrl(src));
      }
      return { images };
    }
  };
}
