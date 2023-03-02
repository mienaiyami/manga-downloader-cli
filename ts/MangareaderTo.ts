import fetch from "node-fetch";
import { Data, makeFileSafe, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import { JSDOM } from "jsdom";
import { writeFileSync } from "fs";

export default class MangareaderTo {
    async getChapters(url: string, start = 0, count = 0) {
        const data: { name: string; url: string }[] = [];
        // let f = "";
        const raw = await fetch(url);
        const html = await raw.text();
        const { document } = new JSDOM(html).window;
        const mangaName = document.querySelector("#ani_detail .manga-name")?.textContent || "";
        document.querySelectorAll("#en-chapters > li.chapter-item").forEach((e) => {
            const chapterNumber = e.getAttribute("data-number");
            // f += chapterNumber + "\n";
            if (chapterNumber) {
                if (parseFloat(chapterNumber) >= start && parseFloat(chapterNumber) <= start + count) {
                    const anchor = e.querySelector("a");
                    if (anchor) {
                        data.push({
                            name: makeFileSafe(anchor?.title) || "",
                            url: `https://mangareader.to` + anchor.href,
                        });
                    }
                }
            }
        });
        // writeFileSync("./test.json", JSON.stringify(data, null, "\t"));
        // writeFileSync("./test.json", f);
        return { mangaName, chapters: data.reverse() };
    }

    // "https://c-1.mreadercdn.com/_v2/1/0dcb8f9eaacfd940603bd75c7c152919c72e45517dcfb1087df215e3be94206cfdf45f64815888ea0749af4c0ae5636fabea0abab8c2e938ab3ad7367e9bfa52/a7/fa/a7fa22001cd2faba0f1d55c88e1e846c/a7fa22001cd2faba0f1d55c88e1e846c.jpg?t=515363393022bbd440b0b7d9918f291a&amp;ttl=1908547557"
    // "https://c-1.mreadercdn.com/_v2/1/0dcb8f9eaacfd940603bd75c7c152919c72e45517dcfb1087df215e3be94206cfdf45f64815888ea0749af4c0ae5636fabea0abab8c2e938ab3ad7367e9bfa52/a7/fa/a7fa22001cd2faba0f1d55c88e1e846c/a7fa22001cd2faba0f1d55c88e1e846c.jpg?t=515363393022bbd440b0b7d9918f291a&ttl=1908547557"
    async getImages(url: string) {
        const raw = await fetch(url);
        const html = await raw.text();

        const imgs: string[] = [];
        const { document } = new JSDOM(html).window;
        const readingId = document.querySelector("#wrapper")?.getAttribute("data-reading-id");
        if (readingId) {
            const raw = await fetch(
                `https://mangareader.to/ajax/image/list/chap/${readingId}?mode=vertical&quality=high&hozPageSize=1`
            );
            const json = (await raw.json()) as { status: boolean; html: string };
            if (json.status) {
                const { document } = new JSDOM(json.html).window;
                document.querySelectorAll(".iv-card").forEach((e) => {
                    if (e.classList.contains("shuffled")) {
                        console.log(`Images shuffled on`, url);
                        return [];
                    }
                    imgs.push(e.getAttribute("data-url") || "");
                });
            }
        }
        return imgs;
    }

    /**
     *
     * @param link link of mangareader.to chapter
     */
    static async download(link: string, start: number, count: number = 0) {
        const instance = new MangareaderTo();
        const { mangaName, chapters } = await instance.getChapters(link, 1075, 999);
        const data: Data[] = Array(chapters.length);
        let i = 0;
        for (let e of chapters) {
            await sleep(4000);
            // console.log(`getting images for`, e.name);
            const imgs = await instance.getImages(e.url);
            data[i++] = {
                name: e.name,
                pages: imgs,
            };
            // console.log("got images for", e.name);
        }
        const queue = new DownloadQueue(mangaName, data, 1000, 5000);
        queue.start();
        // writeFileSync("./test.json", JSON.stringify(data, null, "\t"));
    }
}
