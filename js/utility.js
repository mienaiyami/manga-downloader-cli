export const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));
/**
 * take string and make it safe for file system
 */
export const makeFileSafe = (string) => {
    return string.replace(/(\:|\\|\/|\||\<|\>|\*|\?)/g, "");
};
