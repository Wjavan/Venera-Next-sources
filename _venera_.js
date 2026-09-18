// Venera JavaScript API Type Definitions
// For IDE code completion

interface Network {
    get(url: string, headers?: object): Promise<{status: number, headers: object, body: string}>
    post(url: string, headers: object, data: any): Promise<{status: number, headers: object, body: string}>
    fetchBytes(method: string, url: string, headers: object, data: ArrayBuffer): Promise<{status: number, headers: object, body: ArrayBuffer}>
    setCookies(url: string, cookies: Cookie[]): Promise<void>
    deleteCookies(url: string): Promise<void>
}

interface Convert {
    encodeUtf8(str: string): ArrayBuffer
    decodeUtf8(buf: ArrayBuffer): string
    encodeBase64(buf: ArrayBuffer): string
    decodeBase64(str: string): ArrayBuffer
    md5(buf: ArrayBuffer): ArrayBuffer
    sha1(buf: ArrayBuffer): ArrayBuffer
    sha256(buf: ArrayBuffer): ArrayBuffer
    hmac(key: ArrayBuffer, value: ArrayBuffer, hash: string): ArrayBuffer
    hmacString(key: ArrayBuffer, value: ArrayBuffer, hash: string): string
    decryptAesEcb(value: ArrayBuffer, key: ArrayBuffer): ArrayBuffer
    decryptAesCbc(value: ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer): ArrayBuffer
    hexEncode(buf: ArrayBuffer): string
}

interface HtmlDocument {
    querySelector(selector: string): HtmlElement | null
    querySelectorAll(selector: string): HtmlElement[]
}

interface HtmlElement {
    text: string
    attributes: { [key: string]: string }
    querySelector(selector: string): HtmlElement | null
    querySelectorAll(selector: string): HtmlElement[]
    children: HtmlElement[]
}

interface Cookie {
    name: string
    value: string
    domain: string
}

class Comic {
    constructor(params: { id: string, title: string, subTitle?: string, cover?: string, tags?: string[], description?: string })
}

class ComicDetails {
    constructor(params: {
        title: string
        cover: string
        description: string
        tags: { [key: string]: string[] }
        chapters: Map<string, string>
        recommend?: { id: string, title: string, cover: string }[]
        updateTime?: string
        subId?: string
    })
}

interface ImageLoadingConfig {
    url?: string
    method?: string
    data?: any
    headers?: object
    onResponse?: (buf: ArrayBuffer) => ArrayBuffer
    modifyImage?: string
    onLoadFailed?: () => ImageLoadingConfig
}

declare const Network: Network
declare const Convert: Convert
declare const ComicSource: {
    new(): {
        name: string
        key: string
        version: string
        minAppVersion: string
        url: string
        init?(): void
        settings?: any
        search?: { load: (keyword: string, options: any[], page: number) => Promise<{comics: any[], maxPage: number}>, optionList?: any[] }
        explore?: { title: string, type: string, load: (page: number) => Promise<any> }[]
        category?: { title: string, parts: any[], enableRankingPage: boolean }
        categoryComics?: { load: (category: string, param: string, options: string[], page: number) => Promise<{comics: any[], maxPage: number}>, optionList?: any[] }
        comic?: {
            loadInfo: (id: string) => Promise<any>
            loadEp?: (comicId: string, epId: string) => Promise<{images: string[]}>
            onImageLoad?: (url: string, comicId: string, epId: string) => ImageLoadingConfig
            onThumbnailLoad?: (url: string) => ImageLoadingConfig
            link?: { domains: string[], linkToId: (url: string) => string | null }
            idMatch?: string
            enableTagsTranslate?: boolean
        }
        translation?: { [lang: string]: { [key: string]: string } }
        fixUrl?(url: string): string
    }
}

declare function Comic(params: any): any
declare function ComicDetails(params: any): any
declare function HtmlDocument(html: string): HtmlDocument
declare const Network: Network
declare const Convert: Convert
declare function setTimeout(cb: () => void, ms: number): void
declare function setInterval(cb: () => void, ms: number): any
declare const ComicSource: any
