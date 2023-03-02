import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import path from "path";
import Cubari from "./Cubari.js";
import MangareaderTo from "./MangareaderTo.js";
import { settingsPath } from "./utility.js";
// const cubariGistLink = "https://gist.githubusercontent.com/funkyhippo/1d40bd5dae11e03a6af20e5a9a030d81/raw/?";
// Cubari.download(cubariGistLink, 167);
// const mangareaderUrl = "https://mangareader.to/one-piece-3";
// MangareaderTo.download(mangareaderUrl, 1075, 999);
if (!existsSync(settingsPath)) {
    const temp = {
        saveDir: path.resolve("./downloads"),
    };
    writeFileSync(settingsPath, JSON.stringify(temp, null, "\t"));
}
const SETTINGS = JSON.parse(readFileSync(settingsPath, "utf-8"));
const linkToClass = new Map();
linkToClass.set("https://mangareader.to/", MangareaderTo);
linkToClass.set("https://gist.githubusercontent.com/", Cubari);
const validSite = (url) => {
    for (const e of linkToClass.keys()) {
        if (url.includes(e))
            return true;
    }
    return false;
};
const start = async () => {
    console.log(`
${chalk.greenBright("━━━━━━━━━━━━━━━━ Manga downloader ━━━━━━━━━━━━━━━━")}

Supported sites:
 - https://mangareader.to/  (can't download shuffled images.)
 - https://cubari.moe/  (gist link only e.x. https://gist.githubusercontent.com/)
${chalk.greenBright("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
    `);
    const mangaUrl = await inquirer.prompt({
        name: "mangaUrl",
        type: "input",
        message: "Enter manga URL from site:",
        validate(input) {
            return !validSite(input) ? chalk.red("Invalid Link") : true;
        },
    });
    // log(chalk.greenBright(mangaUrl.mangaUrl));
    const chapter = await inquirer.prompt([
        {
            name: "chapterStart",
            type: "input",
            message: "Start download from chapter:",
            default() {
                return 0;
            },
            validate(input) {
                return isNaN(parseFloat(input)) ? chalk.red("Enter a number") : true;
            },
        },
        {
            name: "count",
            type: "input",
            message: "Count from specified chapter(9999 for all):",
            default() {
                return 0;
            },
            validate(input) {
                return isNaN(parseFloat(input)) ? chalk.red("Enter a number") : true;
            },
        },
    ]);
    const downloader = linkToClass.get([...linkToClass.keys()].find((e) => mangaUrl.mangaUrl.includes(e)));
    downloader.download(mangaUrl.mangaUrl, parseFloat(chapter.chapterStart), parseInt(chapter.count));
};
await start();
