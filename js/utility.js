import path from "path";
import chalk from "chalk";
export const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));
/**
 * take string and make it safe for file system
 */
export const makeFileSafe = (string) => {
    return string.replace(/(\:|\\|\/|\||\<|\>|\*|\?)/g, "");
};
export const settingsPath = path.resolve("./SETTINGS.json");
export const makeLine = (n = 30, color = chalk.greenBright) => console.log(color("━".repeat(n)));
