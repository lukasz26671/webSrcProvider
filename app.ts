import {Request, Response} from "express";
import { SourceResponse } from "./modules/interfaces";

const express = require('express');
const cors = require('cors');
const { Config } = require('./modules/config');
const SheetsReader = require('./modules/SheetsReader')
const serverless = require('serverless-http');

const {getContent, saveContent, getLastModified, sleep} = require('./modules/Functions');

require('dotenv').config();

// import { SheetsReader } from './modules/SheetsReader'

const vars = {
    API_KEY: process.env.APIKEY,
    PORT: process.env.PORT || 3300,
    SHEET_ID: process.env.SHEET_ID,
}

let maxLocal = secondsToMs(Config.maxLocalCacheTime > 0 ? Config.maxLocalCacheTime : 500);
const app = express();
app.use(express.urlencoded({extended:true}));

const GetRanges = () => {
    const ranges = []
    
    Config.cols.forEach(letter => {
        ranges.push(`${letter}${Config.indexStart}:${letter}${Config.maxIndexLength}`)
    });

    return ranges;
}
const sheetReader = new SheetsReader(vars.API_KEY, vars.SHEET_ID, GetRanges());

const cache_local = `${Config.cacheFolder}\\${Config.cacheName}`
const featured_local = `${Config.cacheFolder}\\${Config.cacheFeaturedName}`

let lastRequestSuccessful = true;

function secondsToMs(s) {return s * 1000;}

if (Config.corsEnabled)
    app.use(cors());

(async()=> {
    if (Config.dataCaching) {
        if (Config.cacheTime > 0) {
            await CacheUpdateAsync(Config.cacheTime);
        } else {
            await CacheUpdateAsync(600);
        }
    }
})();


app.get('/', (req : Request, res : Response) => {
    res.header('Access-Control-Allow-Origin: *')
    let content = `
    ${ErrorCodeStyle()}
    <h1>Website Source Provider</h1>
    <p>Everything is up and running! \n Last request: <mark> ${lastRequestSuccessful ? 'succeeded.' : 'failed.'} </mark>
        <br><a href="./api/visualized/readplaylist">Display playlist as a table</a>
        <br><a href="./api/visualized/readplaylist/featured">Display featured playlist as a table</a>
        <br><a href="./api/readplaylist">Display playlist as a JSON string</a>
        <br><a href="./api/readplaylist/featured">Display featured playlist as a JSON string</a>
    </p>
    `
    res.status(200).send(content)
});

function IsEmpty(arr: Array<any>) {
    return arr.length === 0 ? true : false;
}

var cache : SourceResponse = {
    authors: [],
    titles: [],
    IDs: []
}

var cache_featured : SourceResponse = {
    authors: [],
    titles: [],
    IDs: []
}


const CachingCheck = (req : any)=> { return (Config.dataCaching && cache != null && req.query.forceRefresh === false);}
const EmptyCache = ()=> {return (IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs))}
const EmptyFeaturedCache = ()=> {return (IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs))}

const NotAvailableHTML = (res) => { 
    res.status(503).send(`
        ${ErrorCodeStyle()}
        <h1>503</h1>
        <p>Service is unavailable. Try again later.</p>
    `)
}
const NotAvailableJSON = (res : Response) => { 
    res.status(503).send({status: 503, message: "Service is unavailable. Try again later."})
}
const SendPlaylistAsJson = async (
    req : Request | any, 
    res : Response, 
    {featured=false, highlight=false} = {}
    ) => {

    if(CachingCheck(req)) {
        if(highlight) {
            if(featured) {
                return res.status(200).send(
                    JSON.stringify(cache_featured, null, 4)
                );
            }

            return res.status(200).send(
                JSON.stringify(cache, null, 4)
            );
        } 
        if(featured) {
            return res.status(200).send(
                res.status(200).send(cache_featured)
            );
        }
        
        return res.status(200).send(cache);
    } else {
        if(featured) {
            res.status(200).send(
                JSON.stringify(await sheetReader.GetFeaturedPlaylist(), null, 4)
            );
        } else {
            res.status(200).send(
                JSON.stringify(await sheetReader.GetPlaylist(), null, 4)
            );
        }
        if (req.query.forceUpdate === true) {
            CacheUpdateAsync(0, { noupdate: true });
        }
    }
}
app.get('/api/readplaylist', async (req : Request, res : Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (CachingCheck(req)) {
        if (EmptyCache()) {
            return NotAvailableHTML(res);
        } 
        return SendPlaylistAsJson(req, res, {highlight: true});
    } else {
        try {
            return SendPlaylistAsJson(req, res, {highlight: true});
        } catch (error) {
            return NotAvailableHTML(res);
        }

    }
})
app.get('/api/readplaylist/featured', async (req : Request, res : Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (CachingCheck(req)) {
        if (EmptyFeaturedCache()) {
            return NotAvailableHTML(res);
        } 
        return SendPlaylistAsJson(req, res, {highlight: true, featured: true});
    } else {
        try {
            return SendPlaylistAsJson(req, res, {highlight: true, featured: true});
        } catch (error) {
            return NotAvailableHTML(res);
        }

    }
})

app.post('/api/readplaylist', async (req : Request, res : Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (CachingCheck(req)) {
        if (EmptyCache()) {
            await CacheUpdateAsync(1000, {noupdate: true})
            res.redirect(req.originalUrl) 
            return NotAvailableJSON(res);
        } 
        return SendPlaylistAsJson(req, res) 
    } else {
        try { 
            return SendPlaylistAsJson(req, res);
        } catch (error) {
            return NotAvailableJSON(res);
        }

    }
})
app.post('/api/readplaylist/featured', async (req : Request, res : Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (CachingCheck(req)) {
        if (EmptyFeaturedCache()) {
            await CacheUpdateAsync(1000, {noupdate: true})
            res.redirect(req.originalUrl) 
            return NotAvailableJSON(res);
        } 
        return SendPlaylistAsJson(req, res, {highlight: false, featured: true}) 
    } else {
        try { 
            return SendPlaylistAsJson(req, res, {highlight: false, featured: true});
        } catch (error) {
            return NotAvailableJSON(res);
        }

    }
})


/**
 * Update cache asynchronously, after first update, .then() can be used.
 * @param seconds cache refresh time specified in seconds
 * @param noupdate update without looping
 */
async function CacheUpdateAsync(seconds: number, { noupdate } = { noupdate: false }) {
    const time = seconds * 1000;
    const localTime = new Date();

    let ml = await getLastModified(cache_local);
    let mf = await getLastModified(featured_local);

    try {
        let now = Date.now();
        if (ml + maxLocal <= now || mf + maxLocal <= now || noupdate) {
            // let l_cache = await sheetReader.GetPlaylist()
            // let l_cache_featured = await sheetReader.GetFeaturedPlaylist()
            await new Promise((resolve, reject) => { // temp workaround
                try {
                sheetReader.GetPlaylistsCb((lc, fc) => {
                    console.log(lc, fc)
                    cache = lc
                    cache_featured = fc
                    resolve(true);
                })} catch (e) { reject(e)}
            })
            
            
            console.log(`Cache [normal & featrured] updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);
        } else {
            cache = JSON.parse(await getContent(cache_local));
            cache_featured = JSON.parse(await getContent(featured_local));
        }

    } catch (error) {
        console.log("Error updating cache", error);
    }

    if (!noupdate) {
        setTimeout(() => {
            CacheUpdateAsync(seconds)
        }, time);
    }
}

/**
 * Update cache without creating a new Promise
 * @param seconds cache refresh time specified in seconds
 * @param noupdate update without looping
 */
function CacheUpdate(seconds: number, { noupdate } = { noupdate: false }) {
    const time = seconds * 1000;
    const localTime = new Date();
    let cache;
    sheetReader.GetPlaylist().then((res : any) => {
        cache = res;
        console.log(`Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);
    }).catch((err : any) => {
        console.log("Error updating cache", err);
    })

    sheetReader.GetFeaturedPlaylist().then((res : any) => {
        cache_featured = res;
        console.log(`Featured Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);
    }).catch((err : any) => {
        console.log("Error updating featured cache", err);
    })
    if (!noupdate) {
        setTimeout(() => {
            CacheUpdate(seconds)
        }, time);
    }
}

const DisplayTable = (server_res : Response, RangeHandler : any, playlist_response : SourceResponse, html = "")=> {
    let table = `${html}
    <link href="https://fonts.googleapis.com/css2?family=Secular One&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <table>
    <tr>
        <th>Author</th>
        <th>Title</th>
        <th>ID</th>
    </tr>
    `;
    for (let i = 0; RangeHandler(i); i++) {
        
        let elements = [playlist_response.authors[i], playlist_response.titles[i], playlist_response.IDs[i]];

        table += `
        <tr>
            <td>${elements[0]}</td>
            <td><a href="https://youtube.com/watch?v=${elements[2]}">${elements[1]}</a></td>
            <td>${elements[2]}</td>
        </tr>
        `
    }
    table += '</table>'
    table += `<br><p>Total track length:${playlist_response.authors.length}</p>`
    table += `<style> td { font-family: 'Roboto', sans-serif; border: 1px solid black; background-color: #faedddfd} th { font-family: 'Secular One'; border: 1px solid black;} td a:visited { color: inherit; } td a { color: inherit; } </style>`    
    
    server_res.status(200).send(table);
}

app.get('/api/visualized/readplaylist/', async (req : any, res : any) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

a:
    if (CachingCheck(req)) {
        if (EmptyCache()) {
            await CacheUpdateAsync(1000, {noupdate: true})
            res.redirect(req.originalUrl) 
            return NotAvailableHTML(res);
        } else {
            const inRangeCache = (i: number) => (i < cache.authors.length && i < cache.titles.length && i < cache.IDs.length);

            DisplayTable(res, inRangeCache, cache)
        }
    } else {
        try {
            let response = await sheetReader.GetPlaylist();

            const inRange = (i: number) => (i < response.authors.length && i < response.titles.length && i < response.IDs.length);

            DisplayTable(res, inRange, response);

            if (req.query.forceUpdate === true) {
                CacheUpdateAsync(0, { noupdate: true });
            }

        } catch (error) {
            return NotAvailableHTML(res);
        }

    }

})
app.get('/api/visualized/readplaylist/featured', async (req : any, res : any) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (CachingCheck(req)) {
        if (EmptyCache()) {
            await CacheUpdateAsync(1000, {noupdate: true})
            res.redirect(req.originalUrl) 
            return NotAvailableHTML(res);
        } else {
            const inRangeCache = (i: number) => (i < cache_featured.authors.length && i < cache_featured.titles.length && i < cache_featured.IDs.length);

            DisplayTable(res, inRangeCache, cache_featured)
        }
    } else {
        try {
            let response = await sheetReader.GetFeaturedPlaylist();

            const inRange = (i: number) => (i < response.authors.length && i < response.titles.length && i < response.IDs.length);

            DisplayTable(res, inRange, response, "<h1>Featured playlist</h1>");

            if (req.query.forceUpdate === true) {
                CacheUpdateAsync(0, { noupdate: true });
            }

        } catch (error) {
            return NotAvailableHTML(res);
        }

    }

})

var ErrorCodeStyle = () => {  
    return `<style>@import url('https://fonts.googleapis.com/css2?family=Open+Sans&display=swap'); @import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap'); h1 { font-family: 'Roboto'; } p { font-family: 'Open Sans'}</style>`
}

function syntaxHighlight(json : string) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function NotFound(req : any, res : any, next: Function) {
    let content = `
        ${ErrorCodeStyle()}
        <h1>404</h1>
        <p>The page you requested does not exist.</p>
    `
    res.status(404).send(content)
}
app.use(NotFound);
module.exports = app;
module.exports.handler = serverless(app);

