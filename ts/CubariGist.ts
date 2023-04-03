import fetch from "node-fetch";
import { Data, ISETTINGS, makeFileSafe, settingsPath, sleep } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
import path from "path";
import fs from "fs";

// two types
// https://raw.githubusercontent.com/tensurafan/tensurafan.github.io/master/manga-index.json
// https://gist.githubusercontent.com/funkyhippo/1d40bd5dae11e03a6af20e5a9a030d81/raw/?

type GistFormat = {
    chapters: {
        [key: string]: {
            groups: {
                [key: string]: string[] | string;
            };
            title: string;
        };
    };
    cover: string;
    description: string;
    title: string;
};

export default class Cubari {
    /**
     *
     * @param link cubari gist link
     */
    static async download(link: string, start: number, count: number = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const raw = await fetch(link);
        if (raw.ok) {
            const json = (await raw.json()) as GistFormat;
            if (json) {
                const filtered: Data[] = [];
                const chapterAny = json.chapters[Object.keys(json.chapters)[0]];
                const groupAny = chapterAny.groups[Object.keys(chapterAny.groups)[0]];
                if (typeof groupAny === "string") {
                    if (start < 0) {
                        const tempData = [];
                        for (const key in json.chapters) {
                            const obj = json.chapters[key];
                            const pagesJSONraw = await fetch(
                                (obj.groups[Object.keys(obj.groups)[0]] as string).replace(
                                    "/proxy",
                                    "https://cubari.moe/read"
                                )
                            );
                            const pagesJSON = await pagesJSONraw.json();
                            if (pagesJSON instanceof Array) {
                                tempData.push({
                                    name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                                    pages: pagesJSON.map((e) => e.src),
                                    number: parseFloat(key),
                                });
                            } else
                                tempData.push({
                                    name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                                    pages: [],
                                    number: parseFloat(key),
                                });
                        }
                        filtered.push(
                            ...tempData
                                .sort((a, b) => (a.number < b.number ? -1 : 1))
                                .splice(start)
                                .map((e) => ({ name: e.name, pages: e.pages }))
                        );
                    } else {
                        const tempData = [];
                        spinner.update({ text: "Fetching image links..." });
                        for (const key in json.chapters) {
                            if (parseFloat(key) >= start && parseFloat(key) <= start + count) {
                                const obj = json.chapters[key];
                                /**
                                 * 
                                "groups": {
                                "Tempest": "/proxy/api/imgur/chapter/8oF9Tzl/"
                                },

                                main -> https://cubari.moe/read/api/imgur/chapter/kFT21rA/
                                */
                                await sleep(200);
                                const pagesJSONraw = await fetch(
                                    (obj.groups[Object.keys(obj.groups)[0]] as string).replace(
                                        "/proxy",
                                        "https://cubari.moe/read"
                                    )
                                );
                                const pagesJSON = await pagesJSONraw.json();
                                if (pagesJSON instanceof Array) {
                                    tempData.push({
                                        name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                                        pages: pagesJSON.map((e) => e.src),
                                        number: parseFloat(key),
                                    });
                                } else
                                    tempData.push({
                                        name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                                        pages: [],
                                        number: parseFloat(key),
                                    });
                            }
                        }
                        spinner.update({ text: "Preparing for download..." });
                        console.log(tempData);
                        filtered.push(
                            ...tempData
                                .sort((a, b) => (a.number < b.number ? -1 : 1))
                                .map((e) => ({ name: e.name, pages: e.pages }))
                        );
                    }
                    if (filtered.length > 0) {
                        spinner.success();
                        const queue = new DownloadQueue(json.title, filtered, 500);
                        queue.start();
                    } else spinner.error({ text: "No chapters found." });
                } else {
                    if (start < 0) {
                        const tempData = [];
                        for (const key in json.chapters) {
                            const obj = json.chapters[key];
                            tempData.push({
                                name: makeFileSafe(obj.title),
                                pages: obj.groups[Object.keys(obj.groups)[0]] as string[],
                                number: parseFloat(key),
                            });
                        }
                        filtered.push(
                            ...tempData
                                .sort((a, b) => (a.number < b.number ? -1 : 1))
                                .splice(start)
                                .map((e) => ({ name: e.name, pages: e.pages }))
                        );
                    } else
                        for (const key in json.chapters) {
                            if (parseFloat(key) >= start && parseFloat(key) <= start + count) {
                                const obj = json.chapters[key];
                                filtered.push({
                                    name: makeFileSafe(obj.title),
                                    pages: obj.groups[Object.keys(obj.groups)[0]] as string[],
                                });
                            }
                        }
                    // fs.writeFileSync("./test.json",JSON.stringify(filtered,null,"\t"));
                    if (filtered.length > 0) {
                        spinner.success();
                        const queue = new DownloadQueue(json.title, filtered);
                        queue.start();
                    } else spinner.error({ text: "No chapters found." });
                    // filtered.forEach((e) => {
                    //     const savePath = path.join(saveDir, e.name);
                    //     e.pages.forEach((e, i) => saveImage(e, i, savePath));
                    // });
                }
            } else spinner.error({ text: "Unable to parse JSON." });
        } else spinner.error({ text: raw.statusText });
        // fetch(link)
        //     .then((e) => (e.json()))
        //     .then((e) => {
        //         const filtered: Data[] = [];
        //         if (start < 0) {
        //             const tempData = [];
        //             for (const key in e.chapters) {
        //                 const obj = e.chapters[key];
        //                 tempData.push({
        //                     name: makeFileSafe(obj.title),
        //                     pages: obj.groups[Object.keys(obj.groups)[0]],
        //                     number: parseFloat(key),
        //                 });
        //             }
        //             filtered.push(
        //                 ...tempData
        //                     .sort((a, b) => (a.number < b.number ? -1 : 1))
        //                     .splice(start)
        //                     .map((e) => ({ name: e.name, pages: e.pages }))
        //             );
        //         } else
        //             for (const key in e.chapters) {
        //                 if (parseFloat(key) >= start && parseFloat(key) <= start + count) {
        //                     const obj = e.chapters[key];
        //                     filtered.push({
        //                         name: makeFileSafe(obj.title),
        //                         pages: obj.groups[Object.keys(obj.groups)[0]],
        //                     });
        //                 }
        //             }
        //         // fs.writeFileSync("./test.json",JSON.stringify(filtered,null,"\t"));
        //         if (filtered.length > 0) {
        //             spinner.success();
        //             const queue = new DownloadQueue(e.title, filtered);
        //             queue.start();
        //         }
        //         // filtered.forEach((e) => {
        //         //     const savePath = path.join(saveDir, e.name);
        //         //     e.pages.forEach((e, i) => saveImage(e, i, savePath));
        //         // });
        //     })
        //     .catch((e) => spinner.error({ text: e }));
    }
    static async checkForNew(link: string) {
        const spinner = createSpinner("Checking for new chapters.").start();

        const raw = await fetch(link);
        if (raw.ok) {
            const json = (await raw.json()) as GistFormat;
            if (json) {
                spinner.update({ text: 'Checking for new chapters in "' + json.title + '"' });
                const chapters: { name: string; number: number; pages: string[] }[] = [];
                const chapterAny = json.chapters[Object.keys(json.chapters)[0]];
                const groupAny = chapterAny.groups[Object.keys(chapterAny.groups)[0]];
                if (typeof groupAny === "string") {
                    for (const key in json.chapters) {
                        const obj = json.chapters[key];
                        // await sleep(200);
                        // const pagesJSONraw = await fetch(
                        //     (obj.groups[Object.keys(obj.groups)[0]] as string).replace(
                        //         "/proxy",
                        //         "https://cubari.moe/read"
                        //     )
                        // );
                        // const pagesJSON = await pagesJSONraw.json();
                        // if (pagesJSON instanceof Array) {
                        //     chapters.push({
                        //         name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                        //         pages: pagesJSON.map((e) => e.src),
                        //         number: parseFloat(key),
                        //     });
                        // } else
                        chapters.push({
                            name: makeFileSafe(`Chapter ${key} ${obj.title}`),
                            pages: [],
                            number: parseFloat(key),
                        });
                    }
                } else {
                    for (const key in json.chapters) {
                        const obj = json.chapters[key];
                        chapters.push({
                            name: makeFileSafe(obj.title),
                            pages: obj.groups[Object.keys(obj.groups)[0]] as string[],
                            number: parseFloat(key),
                        });
                    }
                }
                chapters.sort((a, b) => (a.number < b.number ? -1 : 1));
                const mangaDir = path.join(
                    (JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as ISETTINGS).saveDir,
                    json.title
                );

                if (fs.existsSync(mangaDir)) {
                    fs.readdir(mangaDir, async (err, files) => {
                        if (err) return console.error(err);
                        let lastChapterNumber = -1;
                        chapters.forEach((e, i) => {
                            if (files.find((a) => a.toLocaleLowerCase() === e.name.toLocaleLowerCase()))
                                lastChapterNumber = e.number;
                        });
                        // console.log(lastChapterNumber, chapters.length);
                        if (lastChapterNumber < chapters[chapters.length - 1].number) {
                            const LCIndex = chapters.findIndex((e) => e.number === lastChapterNumber);
                            // coz can be float
                            const newChapterNumberStart = chapters[LCIndex + 1].number;
                            spinner.success({
                                text: chalk.greenBright(
                                    `${chapters.splice(LCIndex + 1).length} new chapters in "${json.title}".`
                                ),
                            });
                            return this.download(link, newChapterNumberStart, 9999);
                        } else
                            spinner.success({
                                text: chalk.greenBright('No new chapters in "' + json.title + '"'),
                            });
                    });
                }
            }
        }
    }
}
