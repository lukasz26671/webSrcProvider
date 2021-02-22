
const express = require('express');
const cors = require('cors');
const { Config } = require('./modules/config');
const SheetsReader = require('./modules/SheetsReader')

require('dotenv').config();

// import { SheetsReader } from './modules/SheetsReader'

const vars = {
    API_KEY: process.env.APIKEY,
    PORT: process.env.PORT || 3300,
    SHEET_ID: process.env.SHEET_ID,
}


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

let lastRequestSuccessful = true;

if (Config.corsEnabled)
    app.use(cors());

if (Config.dataCaching) {
    if (Config.cacheTime > 0) {
        if (Config.asyncCaching) {
            CacheUpdateAsync(Config.cacheTime)
        } else {
            CacheUpdate(Config.cacheTime)
        }
    } else {
        if (Config.asyncCaching) {
            CacheUpdateAsync(600)
        } else {
            CacheUpdate(600)
        }
    }
}

let httpServer = app.listen(vars.PORT, () => {
    console.log(`Server running on port ${vars.PORT}`)
})

app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin: *')
    let content = `
    ${ErrorCodeStyle()}
    <h1>Website Source Provider</h1>
    <p>Everything is up and running! \n Last request: <mark> ${lastRequestSuccessful ? 'succeeded.' : 'failed.'} </mark>
        <br><a href="./api/visualized/readplaylist">Display playlist as a table</a>
        <br><a href="./api/readplaylist">Display playlist as a JSON string</a></p>
    `
    res.status(200).send(content)
});

function IsEmpty(arr: Array<any>) {
    return arr.length === 0 ? true : false;
}

var cache = {
    authors: [],
    titles: [],
    IDs: []
}

app.get('/api/readplaylist', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (Config.dataCaching && cache != null && req.query.forceRefresh === false) {
        if (IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            res.status(503).send(`
                ${ErrorCodeStyle()}
                <h1>503</h1>
                <p>Service is unavailable. Try again later.</p>
            `)
        } else {
            res.status(200).send(
                syntaxHighlight(JSON.stringify(cache, null, 4))
            );
        }
    } else {
        try {
            res.status(200).send(
                JSON.stringify(await sheetReader.GetPlaylist(), null, 4)
            );

            if (req.query.forceUpdate === true) {
                CacheUpdateAsync(0, { noupdate: true });
            }
        } catch (error) {
            res.status(503).send(`
                ${ErrorCodeStyle()}
                <h1>503</h1>
                <p>Service is unavailable. Try again later.</p>
            `)
        }

    }
})

app.post('/api/readplaylist', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if (Config.dataCaching && cache != null && req.query.forceRefresh === false) {
        if (IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            res.status(503).send({status: 503, message: "Service is unavailable. Try again later."})
        } else {
            res.status(200).send(cache);
        }
    } else {
        try {
            
                res.status(200).send(await sheetReader.GetPlaylist());

            if (req.body.forceUpdate === true) {
                CacheUpdateAsync(0, { noupdate: true });
            }
        } catch (error) {
            res.status(503).send({status: 503, message: "Service is unavailable. Try again later."})
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

    try {
        cache = await sheetReader.GetPlaylist();
        console.log(`Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);

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

    sheetReader.GetPlaylist().then((res) => {
        cache = res;
        console.log(`Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);
    }).catch((err) => {
        console.log("Error updating cache", err);
    })

    if (!noupdate) {
        setTimeout(() => {
            CacheUpdate(seconds)
        }, time);
    }
}

app.get('/api/visualized/readplaylist/', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    let table = `
    <link href="https://fonts.googleapis.com/css2?family=Secular One&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <table>
    <tr>
        <th>Author</th>
        <th>Title</th>
        <th>ID</th>
    </tr>
    `;

    if (Config.dataCaching && cache != null && req.query.forceRefresh === false) {
        if (IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            res.status(503).send(`
                ${ErrorCodeStyle()}
                <h1>503</h1>
                <p>Service is unavailable. Try again later.</p>
            `)
        } else {
            const inRangeCache = (i: number) => (i < cache.authors.length && i < cache.titles.length && i < cache.IDs.length);

            for (let i = 0; inRangeCache(i); i++) {
                
                let elements = [cache.authors[i], cache.titles[i], cache.IDs[i]];

                table += `
                <tr>
                    <td>${elements[0]}</td>
                    <td><a href="https://youtube.com/watch?v=${elements[2]}">${elements[1]}</a></td>
                    <td>${elements[2]}</td>
                </tr>
                `
            }

            table += '</table>'

            table += `<br><p>Total track length:${cache.authors.length}</p>`
            table += `<style> td { font-family: 'Roboto', sans-serif; border: 1px solid black; background-color: #faedddfd} th { font-family: 'Secular One'; border: 1px solid black;} td a:visited { color: inherit} td a { color: inherit; } </style>`

            res.status(200).send(table);
        }
    } else {
        try {
            let response = await sheetReader.GetPlaylist();

            const inRange = (i: number) => (i < response.authors.length && i < response.titles.length && i < response.IDs.length);

            for (let i = 0; inRange(i); i++) {
                ;
                let elements = [response.authors[i], response.titles[i], response.IDs[i]];

                table += `
                <tr>
                    <td>${elements[0]}</td>
                    <td><a href="https://youtube.com/watch?v=${elements[2]}">${elements[1]}</a></td>
                    <td>${elements[2]}</td>
                </tr>
                `
            }

            table += '</table>'
            table += `<br><p>Total track length:${response.authors.length}</p>`
            table += `<style> td { font-family: 'Roboto', sans-serif; border: 1px solid black; background-color: #faedddfd} th { font-family: 'Secular One'; border: 1px solid black;} td a:visited { color: inherit; } td a { color: inherit; } </style>`
            res.status(200).send(table);

            if (req.query.forceUpdate === true) {
                CacheUpdateAsync(0, { noupdate: true });
            }

        } catch (error) {
            res.status(503).send(
                `
                ${ErrorCodeStyle()}
                <h1>503</h1>
                <p>Service is unavailable. Try again later.</p>
                `
            )
        }

    }

})

var ErrorCodeStyle = () => {  
    return `<style>@import url('https://fonts.googleapis.com/css2?family=Open+Sans&display=swap'); @import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap'); h1 { font-family: 'Roboto'; } p { font-family: 'Open Sans'}</style>`
}

function syntaxHighlight(json) {
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

function NotFound(req, res, next) {
    let content = `
        ${ErrorCodeStyle()}
        <h1>404</h1>
        <p>The page you requested does not exist.</p>
    `
    res.status(404).send(content)
}

app.use(NotFound);

export {};