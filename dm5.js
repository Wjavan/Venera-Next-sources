/** @type {import('./_venera_.js')} */
class DM5 extends ComicSource {
  name = "动漫屋";
  key = "dm5";
  version = "1.0.0";
  minAppVersion = "1.6.0";
  url = "https://cdn.jsdelivr.net/gh/Wjavan/venera-next-sources@main/dm5.js";

  settings = {
    domains: {
      title: "选择域名",
      type: "select",
      options: [
        { value: "https://m.dm5.com", text: "m.dm5.com (主站)" },
        { value: "https://www.dm5.com", text: "www.dm5.com (备用)" }
      ],
      default: "https://m.dm5.com"
    }
  };

  get baseUrl() {
    return this.loadSetting("domains") || "https://m.dm5.com";
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36",
      "Referer": this.baseUrl + "/"
    };
  }

  parseComicList(items) {
    const comics = [];
    for (let item of items) {
      const link = item.querySelector("a");
      if (!link) continue;
      const href = link.attributes.href;
      const id = href.split("/").pop().replace(".html", "");
      const title = item.querySelector("h3, .title, .book-title")?.text?.trim() || link.text.trim();
      const cover = item.querySelector("img")?.attributes?.["data-src"] || item.querySelector("img")?.attributes?.src;
      const author = item.querySelector(".author, .book-author")?.text?.trim() || "";
      const update = item.querySelector(".update, .update-time, .chapter")?.text?.trim() || "";
      if (id && title) {
        comics.push(new Comic({
          id, title,
          subTitle: author,
          cover: this.fixUrl(cover),
          tags: [],
          description: update
        }));
      }
    }
    return comics;
  }

  fixUrl(u) {
    if (!u) return "";
    if (u.startsWith("http")) return u;
    if (u.startsWith("//")) return "https:" + u;
    return this.baseUrl.replace(/\/$/, "") + "/" + u.replace(/^\//, "");
  }

  explore = [{
    title: "动漫屋",
    type: "multiPartPage",
    load: async (page) => {
      let url = `${this.baseUrl}/`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `首页加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      const result = {};
      // 热门推荐
      let hotItems = doc.querySelectorAll(".hot-list li, .recommend-list li, .book-list li, .comic-item");
      if (hotItems.length > 0) {
        result["热门推荐"] = this.parseComicList(hotItems);
      }
      // 最新更新
      let newItems = doc.querySelectorAll(".new-list li, .update-list li, .latest-list li");
      if (newItems.length > 0) {
        result["最新更新"] = this.parseComicList(newItems);
      }
      return result;
    }
  }];

  category = null;

  search = {
    load: async (keyword, options, page) => {
      let url = `${this.baseUrl}/search.ashx?key=${encodeURIComponent(keyword)}&page=${page}`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `搜索失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let items = doc.querySelectorAll(".search-list li, .book-list li, .comic-item, .result-item");
      return {
        comics: this.parseComicList(items),
        maxPage: page + 1 // 简单分页
      };
    }
  };

  comic = {
    loadInfo: async (id) => {
      let url = `${this.baseUrl}/manhua-${id}/`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `详情加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      
      let title = doc.querySelector(".book-title, h1, .detail-title")?.text?.trim() || id;
      let cover = doc.querySelector(".book-cover img, .detail-cover img")?.attributes?.src || "";
      let author = doc.querySelector(".book-author, .author, .detail-author")?.text?.trim() || "";
      let description = doc.querySelector(".book-intro, .intro, .description")?.text?.trim() || "";
      let update = doc.querySelector(".last-chapter, .update-chapter")?.text?.trim() || "";
      let status = doc.querySelector(".book-status, .status")?.text?.trim() || "";
      
      // 章节列表
      let chapters = new Map();
      let chapterLinks = doc.querySelectorAll("#chapter-list a, .chapter-list a, .catalog a");
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
      let url = `${this.baseUrl}/${comicId}/${epId}.html`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `章节加载失败: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      
      let images = [];
      let imgNodes = doc.querySelectorAll("#chapter-images img, .chapter-content img, .read-content img");
      for (let img of imgNodes) {
        let src = img.attributes["data-src"] || img.attributes["src"] || "";
        if (src) images.push(this.fixUrl(src));
      }
      return { images };
    }
  };
}
