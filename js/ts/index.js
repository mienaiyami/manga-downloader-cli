import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import path from "path";
import pkgJSON from "../package.json";
import CubariGist from "./CubariGist.js";
import MangaKatana from "./MangaKatana.js";
import MangareaderTo from "./MangareaderTo.js";
import { settingsPath, sleep } from "./utility.js";
// const cubariGistLink = "https://gist.githubusercontent.com/funkyhippo/1d40bd5dae11e03a6af20e5a9a030d81/raw/?";
// Cubari.download(cubariGistLink, 167);
// const mangareaderUrl = "https://mangareader.to/one-piece-3";
// MangareaderTo.download(mangareaderUrl, 1075, 999);
import { Command } from "commander";
const program = new Command();
if (!existsSync(settingsPath)) {
    const temp = {
        saveDir: path.resolve("./downloads"),
        quickLinks: [],
    };
    writeFileSync(settingsPath, JSON.stringify(temp, null, "\t"));
}
const SETTINGS = JSON.parse(readFileSync(settingsPath, "utf-8"));
const addQuickLinkToSettings = (url, note) => {
    if (SETTINGS.quickLinks)
        SETTINGS.quickLinks.push(url + " => " + note);
    else
        SETTINGS.quickLinks = [url + " => " + note];
    SETTINGS.quickLinks = [...new Set(SETTINGS.quickLinks)];
    writeFileSync(settingsPath, JSON.stringify(SETTINGS, null, "\t"));
};
const linkToClass = new Map();
linkToClass.set("https://mangareader.to/", MangareaderTo);
linkToClass.set("https://gist.githubusercontent.com/", CubariGist);
linkToClass.set("https://mangakatana.com/", MangaKatana);
const validSite = (url) => {
    for (const e of linkToClass.keys()) {
        if (url.includes(e))
            return true;
    }
    return false;
};
const checkNewRelease = async () => {
    console.log("Checking for new chapters from quick links...");
    for (const entry of SETTINGS.quickLinks) {
        const link = entry.split(" => ")[0];
        const downloader = linkToClass.get([...linkToClass.keys()].find((e) => link.includes(e)));
        await downloader.checkForNew(link);
        await sleep(3000);
    }
    console.log("Checked all links.");
};
const downloadMangaFromLink = async (mangaURL, chapterStart, chapterCount) => {
    const downloader = linkToClass.get([...linkToClass.keys()].find((e) => mangaURL.includes(e)));
    await downloader.download(mangaURL, chapterStart, chapterCount);
};
program.name("Manga Downloader").description("CLI to download manga from hosting sites.").version(pkgJSON.version);
program
    .command("manga")
    .description("Download Manga from Link")
    .argument("<manga-url>", "link of manga")
    .option("-s, --start <chapter-number>", "start download from this chapter number", "0")
    .option("-c, --count <chapter-count>", "numbers of chapter download from defined start", "0")
    .action((str, options) => {
    if (validSite(str)) {
        if (isNaN(parseFloat(options.start)) || isNaN(parseFloat(options.count))) {
            console.error(chalk.redBright("Please enter nummber for --start and --count."));
            process.exit(1);
        }
        downloadMangaFromLink(str, parseFloat(options.start), parseFloat(options.count));
    }
    else {
        console.error(chalk.redBright("Site not supported."));
        process.exit(1);
    }
});
program
    .command("save")
    .description("Save quick link")
    .argument("<manga-url>", "link of manga")
    .argument("<note>", "note or keyword to identify the link")
    .action((url, note) => {
    if (validSite(url)) {
        addQuickLinkToSettings(url, note.replace("=>", "").trim());
    }
    else {
        console.error(chalk.redBright("Site not supported."));
        process.exit(1);
    }
});
program
    .command("check")
    .description("Check quick links for new chapters(manga folder must have last chapter for this to work)")
    .action(() => {
    checkNewRelease();
});
if (process.argv.length > 2)
    // move to end
    program.parse();
// process.exit(0);
///
///
///
///
///
///
///
///
///
///
export const start = async () => {
    console.clear();
    console.log(`
${chalk.greenBright("━".repeat((process.stdout.columns - 18) / 2) +
        " Manga downloader " +
        "━".repeat((process.stdout.columns - 18) / 2))}

Supported sites:
 - https://mangareader.to/  (can't download shuffled images.)
 - https://cubari.moe/  (gist link only e.x. https://gist.githubusercontent.com/)
 - https://mangakatana.com/

${chalk.greenBright("━".repeat(process.stdout.columns))}

Input "Start download from chapter" in -ve to download from last. e.g. "-2" to download last 2 chapters.

Quick Links:

${(SETTINGS.quickLinks || []).map((e, i) => `${i + 1}. ${e}\n`).join("")}
${chalk.greenBright("━".repeat(process.stdout.columns))}
    `);
    const choices = [
        "Download with Link",
        "Download with Quick Link",
        "Save link for quick access",
        "Check for new chapters",
    ];
    const option = await inquirer.prompt({
        name: "option",
        type: "list",
        message: "Choose:",
        choices,
        default: 0,
    });
    if ((option.option === choices[1] || option.option === choices[3]) &&
        (!SETTINGS.quickLinks || SETTINGS.quickLinks.length === 0)) {
        return console.error(chalk.redBright("Quick link list if empty."));
    }
    if (option.option === choices[3]) {
        return checkNewRelease();
    }
    if (option.option === choices[2]) {
        const mangaUrl = await inquirer.prompt([
            {
                name: "mangaUrl",
                type: "input",
                message: "Enter Manga URL from site:",
                validate(input) {
                    return !validSite(input) ? chalk.red("Invalid Link") : true;
                },
            },
            {
                name: "note",
                type: "input",
                message: "Enter a note or keyword to identify the link:",
                validate(input) {
                    return input === "" ? chalk.red("Must no be empty") : true;
                },
            },
        ]);
        addQuickLinkToSettings(mangaUrl.mangaUrl, mangaUrl.note.replace("=>", "").trim());
        start();
    }
    else {
        const mangaUrl = option.option === choices[1]
            ? await inquirer.prompt({
                name: "mangaUrl",
                type: "list",
                message: "Manga Link",
                choices: SETTINGS.quickLinks,
                filter(input) {
                    return input.split(" => ")[0];
                },
                // message: "Choose:",
            })
            : await inquirer.prompt({
                name: "mangaUrl",
                type: "input",
                message: "Enter Manga/Chapter URL from site:",
                validate(input) {
                    return !validSite(input) ? chalk.red("Invalid Link") : true;
                },
            });
        const chapter = await inquirer.prompt([
            {
                name: "chapterStart",
                type: "input",
                message: "Start download from chapter:",
                default() {
                    return 0;
                },
                filter(input) {
                    input = parseFloat(input);
                    return isNaN(input) ? "" : input;
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
                filter(input) {
                    input = parseInt(input);
                    return isNaN(input) ? "" : input;
                },
                validate(input) {
                    return isNaN(parseInt(input)) ? chalk.red("Enter a number") : true;
                },
            },
        ]);
        downloadMangaFromLink(mangaUrl.mangaUrl, chapter.chapterStart, chapter.count);
    }
};
await start();
