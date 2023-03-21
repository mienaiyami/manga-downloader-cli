import path from "path";
import chalk from "chalk";

export type Data = { name: string; pages: string[] };

export const sleep = async (ms: number) => new Promise((res) => setTimeout(res, ms));
/**
 * take string and make it safe for file system
 */
export const makeFileSafe = (string: string): string => {
    return string.replace(/(\:|\\|\/|\||\<|\>|\*|\?)/g, "");
};

export type ISETTINGS = {
    saveDir: string;
    quickLinks: string[];
};
export const settingsPath = path.resolve("./SETTINGS.json");
export const makeLine = (n = process.stdout.columns, color = chalk.greenBright) =>
    console.log(color("━".repeat(n)));
