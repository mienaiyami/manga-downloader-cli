import { sleep } from "./utility.js";
import path from "path";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import fetch from "node-fetch";
export default class DownloadQueue {
    data = [];
    // private downloaded: Data[] = [];
    mangaName = "";
    mangaDir = "";
    timeBetweenImage = 0;
    timeBetweenChapter = 0;
    /**
     *
     * @param manga name of manga to be saved
     * @param data list of object with chapter name and list of image list
     * @param timeBetweenImage ms between two image download
     * @param timeBetweenChapter ms between two chapter download
     */
    constructor(manga, data, timeBetweenImage = 0, timeBetweenChapter = 0) {
        this.data = data;
        this.mangaName = manga;
        this.mangaDir = path.resolve(`./${manga}/`);
        this.timeBetweenChapter = timeBetweenChapter;
        this.timeBetweenImage = timeBetweenImage;
        if (!fs.existsSync(this.mangaDir))
            fs.mkdirSync(this.mangaDir);
    }
    async start() {
        if (this.data.length >= 1) {
            const cur = this.data[0];
            const saveDir = path.join(this.mangaDir, cur.name).replace(/\.$/g, "_");
            if (!fs.existsSync(saveDir))
                fs.mkdirSync(saveDir);
            else {
                const aa = fs.readdirSync(saveDir);
                if (aa.length === cur.pages.length) {
                    console.log(cur.name, "already exists.");
                    this.data.shift();
                    this.start();
                    return;
                }
            }
            let downloadedCount = 0;
            console.log("Downloading :", cur.name);
            for (const [i, e] of cur.pages.entries()) {
                await sleep(this.timeBetweenImage);
                process.stdout.write(downloadedCount + "/" + cur.pages.length);
                this.downloadImage(e, i, saveDir).then(() => {
                    downloadedCount++;
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    if (downloadedCount >= cur.pages.length) {
                        console.log("Downloaded all images in chapter " + cur.name);
                        this.data.shift();
                        sleep(this.timeBetweenChapter).then(() => {
                            this.start();
                        });
                    }
                });
            }
        }
        else
            console.log("Downloaded All.");
    }
    async downloadImage(url, i, dir) {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(url, "didnt load, retrying in 5s");
            await sleep(5000);
            this.downloadImage(url, i, dir);
            return;
        }
        const arrBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrBuffer);
        const fileType = await fileTypeFromBuffer(buffer);
        if (fileType) {
            const p = i.toString().padStart(3, "0") + "." + fileType.ext;
            fs.createWriteStream(path.join(dir, p)).write(buffer);
        }
        else {
            console.error("error saving", dir, i, "\n");
        }
    }
}
