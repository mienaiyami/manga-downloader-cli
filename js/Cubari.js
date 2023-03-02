import fetch from "node-fetch";
import { makeFileSafe } from "./utility.js";
import DownloadQueue from "./DownloadQueue.js";
export default class Cubari {
    /**
     *
     * @param link cubari gist link
     */
    static download(link, start, count = 0) {
        fetch(link)
            .then((e) => e.json())
            .then((e) => {
            const filtered = [];
            for (const key in e.chapters) {
                if (parseFloat(key) >= start && parseFloat(key) <= start + count) {
                    const obj = e.chapters[key];
                    filtered.push({
                        name: makeFileSafe(obj.title),
                        pages: obj.groups[Object.keys(obj.groups)[0]],
                    });
                }
            }
            // fs.writeFileSync("./test.json",JSON.stringify(filtered,null,"\t"));
            const queue = new DownloadQueue(e.title, filtered);
            queue.start();
            // filtered.forEach((e) => {
            //     const savePath = path.join(saveDir, e.name);
            //     e.pages.forEach((e, i) => saveImage(e, i, savePath));
            // });
        });
    }
}
