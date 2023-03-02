export type Data = { name: string; pages: string[] };

export const sleep = async (ms: number) => new Promise((res) => setTimeout(res, ms));
/**
 * take string and make it safe for file system
 */
export const makeFileSafe = (string: string): string => {
    return string.replace(/(\:|\\|\/|\||\<|\>|\*|\?)/g, "");
};
