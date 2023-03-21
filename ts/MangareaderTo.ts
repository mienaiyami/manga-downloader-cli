import fetch from "node-fetch";
import { Data, ISETTINGS, makeFileSafe, settingsPath, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import { JSDOM } from "jsdom";
import fs from "fs";
import chalk from "chalk";
import { createSpinner, Spinner } from "nanospinner";
import path from "path";

export default class MangareaderTo {
    async getChapters(url: string, start = 0, count = 0) {
        count = start === 0 ? 9999 : count;
        const data: { name: string; url: string; number: number }[] = [];
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
            const mangaName = makeFileSafe(
                document.querySelector("#header .manga-name")?.textContent || "eeeeeeeeee"
            );
            const name = makeFileSafe(
                document
                    .querySelector('meta[name="keywords"]')
                    ?.getAttribute("content")
                    ?.split(",")[0]
                    .replace(`${mangaName} `, "") || "eeeeeeeeee"
            );
            // spinner.stop();
            // spinner.clear();
            console.log(chalk.redBright("mangareader.to chapter link used. Chapter name might not be accurate."));
            // spinner.start();
            const chapters = [{ name, url, number: 0 }];
            return { mangaName, chapters };
        }
        const mangaName = makeFileSafe(
            document.querySelector("#ani_detail .manga-name")?.textContent || "eeeeeeeeee"
        );
        if (start < 0) {
            const tempData = [...document.querySelectorAll("#en-chapters > li.chapter-item")]
                .map((e) => {
                    const chapterNumber = parseFloat(e.getAttribute("data-number") || " ");
                    if (chapterNumber) {
                        const anchor = e.querySelector("a");
                        if (anchor) {
                            return {
                                number: chapterNumber,
                                name: makeFileSafe(anchor?.title) || "",
                                url: `https://mangareader.to` + anchor.href,
                            };
                        } else return { name: "", url: "", number: 0 };
                    } else return { name: "", url: "", number: 0 };
                })
                .filter((e) => e.url !== "");
            data.push(
                ...tempData
                    .sort((a, b) => (a.number < b.number ? -1 : 1))
                    .splice(start)
                    // .map((e) => ({ name: e.name, url: e.url }))
                    .reverse()
            );
        } else
            document.querySelectorAll("#en-chapters > li.chapter-item").forEach((e) => {
                const chapterNumber = parseFloat(e.getAttribute("data-number") || " ");
                if (chapterNumber) {
                    if (chapterNumber >= start && chapterNumber <= start + count) {
                        const anchor = e.querySelector("a");
                        if (anchor) {
                            data.push({
                                name: makeFileSafe(anchor?.title) || "",
                                url: `https://mangareader.to` + anchor.href,
                                number: chapterNumber,
                            });
                        }
                    }
                }
            });
        return { mangaName, chapters: data.reverse() };
    }
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
    static async download(link: string, start: number, count: number = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const instance = new MangareaderTo();
        const { mangaName, chapters } = await instance.getChapters(link, start, count);
        let data: Data[] = [];
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
        } else {
            spinner.error({ text: chalk.redBright("No chapters.") });
        }
        // writeFileSync("./test.json", JSON.stringify(data, null, "\t"));
    }
    static async checkForNew(link: string) {
        const spinner = createSpinner("Checking for new chapters.").start();
        const instance = new MangareaderTo();
        const { mangaName, chapters } = await instance.getChapters(link);
        spinner.update({ text: 'Checking for new chapters in "' + mangaName + '"' });
        const mangaDir = path.join(
            (JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as ISETTINGS).saveDir,
            mangaName
        );
        if (fs.existsSync(mangaDir)) {
            fs.readdir(mangaDir, async (err, files) => {
                if (err) return console.error(err);
                let lastChapterNumber = -1;
                chapters.forEach((e, i) => {
                    if (files.includes(e.name)) lastChapterNumber = e.number;
                });
                console.log(lastChapterNumber, chapters.length);
                if (lastChapterNumber < chapters[chapters.length - 1].number) {
                    const LCIndex = chapters.findIndex((e) => e.number === lastChapterNumber);
                    // coz can be float
                    const newChapterNumberStart = chapters[LCIndex + 1].number;
                    spinner.success({
                        text: chalk.greenBright(
                            `${chapters.splice(LCIndex + 1).length} new chapters in "${mangaName}".`
                        ),
                    });
                    return this.download(link, newChapterNumberStart, 9999);
                } else spinner.success({ text: chalk.greenBright('No new chapters in "' + mangaName + '"') });
            });
        } else {
            spinner.error({ text: chalk.redBright("Could not find manga directory: " + mangaDir) });
        }
    }
}
