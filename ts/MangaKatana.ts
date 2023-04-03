import fetch from "node-fetch";
import { Data, makeFileSafe, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import { JSDOM } from "jsdom";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { createSpinner, Spinner } from "nanospinner";

export default class MangaKatana {
    async getChapters(url: string, start = 0, count = 0, spinner: Spinner) {
        count = start === 0 && count === 0 ? 9999 : count;
        const data: { name: string; url: string }[] = [];
        const raw = await fetch(url);
        if (!raw.ok) {
            return {
                mangaName: "",
                chapters: [],
            };
        }
        const html = await raw.text();
        const { document } = new JSDOM(html).window;
        // if (url.includes("https://mangareader.to/read/")) {
        //     const mangaName = document.querySelector("#header .manga-name")?.textContent || "eeeeeeeeee";
        //     const name = url.split("/").pop() || "eeeeeeeeee";
        //     spinner.stop();
        //     spinner.clear();
        //     console.log(chalk.redBright("mangareader.to chapter link used. Chapter name might not be accurate."));
        //     spinner.start();
        //     const chapters = [{ name, url }];
        //     return { mangaName, chapters };
        // }

        if (document.querySelector('meta[name="description"]')?.getAttribute("content")?.startsWith("Read")) {
            const mangaName = makeFileSafe(
                document.querySelector("#breadcrumb_wrap > ol > li:nth-child(2) > a > span")?.textContent ||
                    "eeeeeeeee"
            );
            const name = makeFileSafe(
                document.querySelector("#breadcrumb_wrap > ol > li:nth-child(3) > a > span")?.textContent ||
                    "eeeeeeeee"
            );
            const chapters = [{ name, url }];
            return { mangaName, chapters };
        }

        const mangaName = makeFileSafe(
            document.querySelector("#single_book > div.d-cell-medium.text > div > h1")?.textContent || "eeeeeeeeee"
        );
        if (start < 0) {
            const tempData = (
                [...document.querySelectorAll("div#single_book > .chapters a")].reverse() as HTMLAnchorElement[]
            )
                .map((e, i) => {
                    const chapterNumber = i;
                    return {
                        number: chapterNumber,
                        name: makeFileSafe(e.innerText) || "",
                        url: e.href,
                    };
                })
                .filter((e) => e.url !== "");
            data.push(
                ...tempData
                    .sort((a, b) => (a.number < b.number ? -1 : 1))
                    .splice(start)
                    .map((e) => ({ name: e.name, url: e.url }))
                    .reverse()
            );
            console.log(document.querySelectorAll("div#single_book > .chapters a").length);
        } else
            ([...document.querySelectorAll("div#single_book > .chapters a")] as HTMLAnchorElement[])
                .reverse()
                .forEach((e, i) => {
                    const chapterNumber = i;
                    if (chapterNumber >= start && chapterNumber <= start + count)
                        data.push({
                            name: makeFileSafe(e.textContent || ""),
                            url: e.href,
                        });
                });
        return { mangaName, chapters: data };
    }
    async getImages(url: string) {
        const imgs: string[] = [];
        const raw = await fetch(url);
        const html = await raw.text();
        if (html) {
            // const { document } = new JSDOM(json.html).window;
            // come outs to be '#'
            // maybe will work fine if used in electron window
            // for (const e of document.querySelectorAll("#imgs .wrap_img img[data-src]")) {
            //     imgs.push(e.getAttribute("data-src") || "");
            // }
            const regexRes = html.match(/\['https:\/\/i1\.mangakatana.*,]/gi);
            if (regexRes)
                if (regexRes.length >= 2) {
                    imgs.push(...JSON.parse(regexRes[1].replaceAll("'", '"').replace(",]", "]")));
                }
        }
        return imgs;
    }
    /**
     *
     * @param link link of mangakatana.com chapter
     */
    static async download(link: string, start: number, count: number = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const instance = new MangaKatana();
        const { mangaName, chapters } = await instance.getChapters(link, start, count, spinner);
        let data: Data[] = [];
        for (let e of chapters) {
            // waiting before fetiching next chapter data
            await sleep(1000);
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
}
