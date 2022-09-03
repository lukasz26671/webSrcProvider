const { dirname } = require('path');
const appDir = dirname(require.main.filename);

const Config = {
    dataCaching: true,
    cacheTime: 660,
    corsEnabled: true,
    limitRequests: false,
    asyncCaching: true,
    indexStart: 3,
    maxIndexLength: 200,
    cols: ["C", "D", "E", "F"],
    cacheFolder: `${appDir}\\temp`,
    cacheFeaturedName: "featured.json",
    cacheName: "cache.json",
    maxLocalCacheTime: 500
};

module.exports = {Config};

