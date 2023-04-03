import { Data, ISETTINGS, makeLine, settingsPath, sleep } from "./utility.js";

import path from "path";
import fs, { readFileSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import fetch from "node-fetch";
import chalk from "chalk";
import { createSpinner } from "nanospinner";

export default class DownloadQueue {
    private data: Data[] = [];
    // private downloaded: Data[] = [];
    mangaName: string = "";
    private mangaDir: string = "";
    private timeBetweenImage = 0;
    private timeBetweenChapter = 0;
    private retryCount: number[] = [];
    /**
     *
     * @param manga name of manga to be saved
     * @param data list of object with chapter name and list of image list
     * @param timeBetweenImage ms between two image download
     * @param timeBetweenChapter ms between two chapter download
     */
    constructor(manga: string, data: Data[], timeBetweenImage = 0, timeBetweenChapter = 0) {
        this.data = data;
        this.mangaName = manga;
        const SETTINGS: ISETTINGS = JSON.parse(readFileSync(settingsPath, "utf-8"));
        this.mangaDir = path.join(SETTINGS.saveDir, manga);
        // this.mangaDir = path.resolve(`./downloads/${manga}/`);
        //D:\old hdd stuff\mangas\
        this.timeBetweenChapter = timeBetweenChapter;
        this.timeBetweenImage = timeBetweenImage;
        if (!fs.existsSync(path.resolve(`./downloads/`))) fs.mkdirSync(`./downloads/`);
        if (!fs.existsSync(this.mangaDir)) fs.mkdirSync(this.mangaDir);
        makeLine();
        console.log(chalk.greenBright("Manga:"), manga);
        console.log(chalk.greenBright("Directory:"), this.mangaDir);
        makeLine();
        console.log("Downloading following chapters:");
        console.log(" - " + data.map((e) => e.name).join("\n - "));
        makeLine();
    }
    async start() {
        if (this.data.length >= 1) {
            const cur = this.data[0];
            const saveDir = path.join(this.mangaDir, cur.name).replace(/\.$/g, "_");
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);
            else {
                const aa = fs.readdirSync(saveDir);
                if (aa.length >= cur.pages.length) {
                    console.log(chalk.redBright(`"${cur.name}"`, "already exists."));

                    this.data.shift();
                    this.start();
                    return;
                }
            }
            let downloadedCount = 0;
            console.log(chalk.greenBright("Downloading:"), cur.name);
            const spinner = createSpinner("0/" + cur.pages.length).start();
            this.retryCount = new Array(cur.pages.length).fill(0);
            for (const [i, e] of cur.pages.entries()) {
                await sleep(this.timeBetweenImage);
                this.retryCount[i] = 0;
                this.downloadImage(e, i, saveDir).then(() => {
                    downloadedCount++;
                    spinner.update({ text: downloadedCount + "/" + cur.pages.length });
                    // process.stdout.clearLine(-1);
                    // process.stdout.cursorTo(0);
                    // process.stdout.write(downloadedCount + "/" + cur.pages.length);
                    if (downloadedCount >= cur.pages.length) {
                        // console.log("Downloaded all images in chapter " + cur.name);
                        // process.stdout.write("\n");
                        this.data.shift();
                        spinner.success();
                        sleep(this.timeBetweenChapter).then(() => {
                            this.start();
                        });
                    }
                });
            }
        } else {
            console.log(chalk.greenBright("Downloaded all Chapters."));
        }
    }
    private async downloadImage(url: string, i: number, dir: string): Promise<void> {
        i++;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.log(url, "didn't load, retrying in 5s.");
                await sleep(5000);
                this.downloadImage(url, i - 1, dir);
                return;
            }
            const arrBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrBuffer);
            const fileType = await fileTypeFromBuffer(buffer);
            if (fileType) {
                const p = i.toString().padStart(3, "0") + "." + fileType.ext;
                fs.createWriteStream(path.join(dir, p)).write(buffer);
            } else {
                console.error(chalk.redBright("error saving", dir, i, "\n"));
            }
        } catch {
            this.retryCount[i - 1]++;
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            if (this.retryCount[i - 1] > 3)
                return console.error(chalk.redBright("Unable to download page " + i + "."));
            console.error(chalk.redBright("Could not download page " + i + ", retrying in 6sec"));
            await sleep(6000);
            return this.downloadImage(url, i - 1, dir);
        }
    }
}
