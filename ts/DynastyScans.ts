import fetch from "node-fetch";
import { Data, ISETTINGS, makeFileSafe, settingsPath, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import { JSDOM } from "jsdom";
import fs from "fs";
import chalk from "chalk";
import { createSpinner, Spinner } from "nanospinner";
import path from "path";

type DynastyScansJSON = {
    name: string;
    type: string;
    permalink: string;
    tags: string[];
    cover: string;
    link: string;
    description: string;
    aliases: string[];
    taggings: {
        title: string;
        permalink: string;
        released_on: string;
        tags: string[];
    }[];
};

export default class DynastyScans {
    baseURL = "https://dynasty-scans.com/" as const;
    async getChapters(url: string, start = 0, count = 0) {
        count = start === 0 && count === 0 ? 9999 : count;
        const data: { name: string; url: string; number: number }[] = [];
        // const raw = await fetch(url);
        // if (!raw.ok) {
        //     return {
        //         mangaName: "",
        //         chapters: [],
        //     };
        // }
        // const html = await raw.text();
        // const { document } = new JSDOM(html).window;
        const raw = await fetch(url + ".json");
        if (!raw.ok) {
            return {
                mangaName: "",
                chapters: [],
            };
        }
        const json = (await raw.json()) as DynastyScansJSON;
        // if (url.includes("https://mangareader.to/read/")) {
        //     const mangaName = makeFileSafe(
        //         document.querySelector("#header .manga-name")?.textContent || "eeeeeeeeee"
        //     );
        //     const name = makeFileSafe(
        //         document
        //             .querySelector('meta[name="keywords"]')
        //             ?.getAttribute("content")
        //             ?.split(",")[0]
        //             .replace(`${mangaName} `, "") || "eeeeeeeeee"
        //     );
        //     // spinner.stop();
        //     // spinner.clear();
        //     console.log(chalk.redBright("mangareader.to chapter link used. Chapter name might not be accurate."));
        //     // spinner.start();
        //     const chapters = [{ name, url, number: 0 }];
        //     return { mangaName, chapters };
        // }
        // const mangaName = makeFileSafe(
        //     document.querySelector("#main > tag-title > b")?.textContent || "eeeeeeeeee"
        // );
        const mangaName = makeFileSafe(json.name);
        // if (start < 0) {
        //     const tempData = [...document.querySelectorAll(".chapter-list > dd > a")]
        //         .map((e) => {
        //             const chapterNumber = parseFloat(e.getAttribute("data-number") || " ");
        //             if (chapterNumber) {
        //                 const anchor = e.querySelector("a");
        //                 if (anchor) {
        //                     return {
        //                         number: chapterNumber,
        //                         name: makeFileSafe(anchor?.title) || "",
        //                         url: `https://dynasty-scans.com` + anchor.href,
        //                     };
        //                 } else return { name: "", url: "", number: 0 };
        //             } else return { name: "", url: "", number: 0 };
        //         })
        //         .filter((e) => e.url !== "");
        //     data.push(
        //         ...tempData
        //             .sort((a, b) => (a.number < b.number ? -1 : 1))
        //             .splice(start)
        //             // .map((e) => ({ name: e.name, url: e.url }))
        //             .reverse()
        //     );
        // } else
        // ([...document.querySelectorAll(".chapter-list > dd > a")] as HTMLAnchorElement[]).forEach((e, i) => {
        //     // const chapterNumber = parseFloat(e.getAttribute("data-number") || " ");
        //     const chapterNumber = i + 1;
        //     if (chapterNumber) {
        //         if (chapterNumber >= start && chapterNumber <= start + count) {
        //             data.push({
        //                 name: makeFileSafe(e?.innerText) || "",
        //                 url: `https://dynasty-scans.com` + e.href,
        //                 number: chapterNumber,
        //             });
        //         }
        //     }
        // });

        if (start < 0) {
            json.taggings.forEach((e, i) => {
                data.push({
                    name: makeFileSafe(e.title),
                    url: this.baseURL + "chapters/" + e.permalink,
                    number: i + 1,
                });
            });
            data.splice(0, data.length + start);
        } else
            json.taggings.forEach((e, i) => {
                if (i >= start && i <= start + count)
                    data.push({
                        name: makeFileSafe(e.title),
                        url: this.baseURL + "chapters/" + e.permalink,
                        number: i + 1,
                    });
            });
        console.log(start, data);
        return { mangaName, chapters: data };
    }
    async getImages(url: string) {
        const raw = await fetch(url + ".json");
        const json = (await raw.json()) as { title: string; pages: { name: string; url: string }[] };

        const imgs = json.pages.map((e) => this.baseURL + e.url);
        return imgs;
    }

    /**
     *
     * @param link link of mangareader.to chapter
     */
    static async download(link: string, start: number, count: number = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const instance = new DynastyScans();
        const { mangaName, chapters } = await instance.getChapters(link, start, count);
        let data: Data[] = [];
        for (let e of chapters) {
            await sleep(2000);
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
            const queue = new DownloadQueue(mangaName, data, 1000, 1000);
            queue.start();
        } else {
            spinner.error({ text: chalk.redBright("No chapters.") });
        }
        // writeFileSync("./test.json", JSON.stringify(data, null, "\t"));
    }
    // static async checkForNew(link: string) {
    //     const spinner = createSpinner("Checking for new chapters.").start();
    //     const instance = new DynastyScans();
    //     const { mangaName, chapters } = await instance.getChapters(link);
    //     spinner.update({ text: 'Checking for new chapters in "' + mangaName + '"' });
    //     const mangaDir = path.join(
    //         (JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as ISETTINGS).saveDir,
    //         mangaName
    //     );
    //     if (fs.existsSync(mangaDir)) {
    //         fs.readdir(mangaDir, async (err, files) => {
    //             if (err) return console.error(err);
    //             let lastChapterNumber = -1;
    //             chapters.forEach((e, i) => {
    //                 if (files.includes(e.name)) lastChapterNumber = e.number;
    //             });
    //             console.log(lastChapterNumber, chapters.length);
    //             if (lastChapterNumber < chapters[chapters.length - 1].number) {
    //                 const LCIndex = chapters.findIndex((e) => e.number === lastChapterNumber);
    //                 // coz can be float
    //                 const newChapterNumberStart = chapters[LCIndex + 1].number;
    //                 spinner.success({
    //                     text: chalk.greenBright(
    //                         `${chapters.splice(LCIndex + 1).length} new chapters in "${mangaName}".`
    //                     ),
    //                 });
    //                 return this.download(link, newChapterNumberStart, 9999);
    //             } else spinner.success({ text: chalk.greenBright('No new chapters in "' + mangaName + '"') });
    //         });
    //     } else {
    //         spinner.error({ text: chalk.redBright("Could not find manga directory: " + mangaDir) });
    //     }
    // }
}
