import fetch from "node-fetch";
import { makeFileSafe, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import { JSDOM } from "jsdom";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
export default class MangareaderTo {
    async getChapters(url, start = 0, count = 0, spinner) {
        const data = [];
        const raw = await fetch(url);
        if (!raw.ok) {
            return {
                mangaName: "",
                chapters: [],
            };
        }
        const html = await raw.text();
        const { document } = new JSDOM(html).window;
        if (url.includes("https://mangareader.to/read/")) {
            const mangaName = document.querySelector("#header .manga-name")?.textContent || "eeeeeeeeee";
            const name = url.split("/").pop() || "eeeeeeeeee";
            spinner.stop();
            spinner.clear();
            console.log(chalk.redBright("mangareader.to chapter link used. Chapter name might not be accurate."));
            spinner.start();
            const chapters = [{ name, url }];
            return { mangaName, chapters };
        }
        const mangaName = document.querySelector("#ani_detail .manga-name")?.textContent || "eeeeeeeeee";
        document.querySelectorAll("#en-chapters > li.chapter-item").forEach((e) => {
            const chapterNumber = e.getAttribute("data-number");
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
        return { mangaName, chapters: data.reverse() };
    }
    async getImages(url) {
        const raw = await fetch(url);
        const html = await raw.text();
        const imgs = [];
        const { document } = new JSDOM(html).window;
        const readingId = document.querySelector("#wrapper")?.getAttribute("data-reading-id");
        if (readingId) {
            const raw = await fetch(`https://mangareader.to/ajax/image/list/chap/${readingId}?mode=vertical&quality=high&hozPageSize=1`);
            const json = (await raw.json());
            if (json.status) {
                const { document } = new JSDOM(json.html).window;
                for (const e of document.querySelectorAll(".iv-card")) {
                    if (e.classList.contains("shuffled")) {
                        console.log(chalk.redBright(`\nImages shuffled on`, url));
                        return [];
                    }
                    imgs.push(e.getAttribute("data-url") || "");
                }
            }
        }
        return imgs;
    }
    /**
     *
     * @param link link of mangareader.to chapter
     */
    static async download(link, start, count = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const instance = new MangareaderTo();
        const { mangaName, chapters } = await instance.getChapters(link, start, count, spinner);
        let data = [];
        for (let e of chapters) {
            await sleep(4000);
            // console.log(`getting images for`, e.name);
            const imgs = await instance.getImages(e.url);
            if (imgs.length > 0)
                data.push({
                    name: e.name,
                    pages: imgs,
                });
            // console.log("got images for", e.name);
        }
        if (data.length > 0) {
            spinner.success();
            const queue = new DownloadQueue(mangaName, data, 1000, 5000);
            queue.start();
        }
        else {
            spinner.error({ text: chalk.redBright("No chapters.") });
        }
        // writeFileSync("./test.json", JSON.stringify(data, null, "\t"));
    }
}
