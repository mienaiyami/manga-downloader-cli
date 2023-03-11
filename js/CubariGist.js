import fetch from "node-fetch";
import { makeFileSafe, settingsPath } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
import path from "path";
import fs from "fs";
export default class Cubari {
    /**
     *
     * @param link cubari gist link
     */
    static async download(link, start, count = 0) {
        const spinner = createSpinner("Getting Data...").start();
        const raw = await fetch(link);
        if (raw.ok) {
            const json = (await raw.json());
            if (json) {
                const filtered = [];
                if (start < 0) {
                    const tempData = [];
                    for (const key in json.chapters) {
                        const obj = json.chapters[key];
                        tempData.push({
                            name: makeFileSafe(obj.title),
                            pages: obj.groups[Object.keys(obj.groups)[0]],
                            number: parseFloat(key),
                        });
                    }
                    filtered.push(...tempData
                        .sort((a, b) => (a.number < b.number ? -1 : 1))
                        .splice(start)
                        .map((e) => ({ name: e.name, pages: e.pages })));
                }
                else
                    for (const key in json.chapters) {
                        if (parseFloat(key) >= start && parseFloat(key) <= start + count) {
                            const obj = json.chapters[key];
                            filtered.push({
                                name: makeFileSafe(obj.title),
                                pages: obj.groups[Object.keys(obj.groups)[0]],
                            });
                        }
                    }
                // fs.writeFileSync("./test.json",JSON.stringify(filtered,null,"\t"));
                if (filtered.length > 0) {
                    spinner.success();
                    const queue = new DownloadQueue(json.title, filtered);
                    queue.start();
                }
                // filtered.forEach((e) => {
                //     const savePath = path.join(saveDir, e.name);
                //     e.pages.forEach((e, i) => saveImage(e, i, savePath));
                // });
            }
            else
                spinner.error({ text: "Unable to parse JSON." });
        }
        else
            spinner.error({ text: raw.statusText });
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
    static async checkForNew(link) {
        const spinner = createSpinner("Checking for new chapters.").start();
        const raw = await fetch(link);
        if (raw.ok) {
            const json = (await raw.json());
            if (json) {
                spinner.update({ text: 'Checking for new chapters in "' + json.title + '"' });
                const chapters = [];
                for (const key in json.chapters) {
                    const obj = json.chapters[key];
                    chapters.push({
                        name: makeFileSafe(obj.title),
                        pages: obj.groups[Object.keys(obj.groups)[0]],
                        number: parseFloat(key),
                    });
                }
                const mangaDir = path.join(JSON.parse(fs.readFileSync(settingsPath, "utf-8")).saveDir, json.title);
                if (fs.existsSync(mangaDir)) {
                    fs.readdir(mangaDir, async (err, files) => {
                        if (err)
                            return console.error(err);
                        let lastChapterIndex = -1;
                        chapters.forEach((e, i) => {
                            if (files.includes(e.name))
                                lastChapterIndex = i;
                        });
                        if (lastChapterIndex !== chapters.length - 1) {
                            const newChapterIndex = lastChapterIndex + 1;
                            spinner.success({
                                text: chalk.greenBright(`${newChapterIndex - lastChapterIndex + 1} new chapters in "${json.title}".`),
                            });
                            return this.download(link, newChapterIndex + 1, 9999);
                        }
                        else
                            spinner.success({
                                text: chalk.greenBright('No new chapters in "' + json.title + '"'),
                            });
                    });
                }
            }
        }
    }
}
