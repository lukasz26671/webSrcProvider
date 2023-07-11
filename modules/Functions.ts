
const { promises: fs } = require("fs");

async function getContent(filePath, encoding = "utf-8") {
    if (!filePath) {
        throw new Error("filePath required");
    }

    await fs.access(filePath, fs.F_OK, async(err) => {
        if (err) {
            await fs.writeFile(filePath, "{}", {encoding})
        }
    })

    return fs.readFile(filePath, { encoding });
}
async function saveContent(filePath, data, encoding = "utf-8") {
    if (!filePath) {
        throw new Error("filePath required");
    }

    return fs.writeFile(filePath, data, {encoding});
}

async function getLastModified(filePath) {
    try {
        await fs.access(filePath)
    } catch (e) {return 0;}
    return await fs.stat(filePath).mtimeMs;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {getContent, saveContent, getLastModified, sleep}