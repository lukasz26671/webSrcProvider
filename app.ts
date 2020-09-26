
const express = require('express');
const cors = require('cors');
const { Config } = require('./modules/config');
const SheetsReader = require('./modules/SheetsReader')

require('dotenv').config();

// import { SheetsReader } from './modules/SheetsReader'
const apikey = process.env.APIKEY
const port = process.env.PORT || 3300

const app = express();

let lastRequestSuccessful = true;
var sheetReader = new SheetsReader(apikey);

if (Config.corsEnabled)
    app.use(cors());

if (Config.dataCaching) {
    if (Config.cacheTime > 0) {
        if(Config.asyncCaching) {
            CacheUpdateAsync(Config.cacheTime)
        } else {
            CacheUpdate(Config.cacheTime)
        }
    } else {
        if(Config.asyncCaching) {
            CacheUpdateAsync(600)
        } else {
            CacheUpdate(600)
        }
    }
}


let httpServer = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})



app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin: *')
    res.status(200).send(
        `Everything is up and running! \n Last request: <mark> ${lastRequestSuccessful ? 'succeeded.' : 'failed.'} </mark>
        <br><a href="./api/visualized/readplaylist">Display playlist as a table</a>
        <br><a href="./api/readplaylist">Display playlist as a JSON string</a>
        `)
});

function IsEmpty(arr : Array<any>) {
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

    if(Config.dataCaching && cache != null) {
        if(IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            res.status(503).send("503: API error.")
        } else {
            res.status(200).send(cache);
        }
    } else {
         try {
            res.status(200).send(
                await sheetReader.GetPlaylist()
            );
        } catch (error) {
            res.status(503).send("503: API error.")
        }

    }
})


async function CacheUpdateAsync (seconds : number) {
    const time = seconds * 1000;
    const localTime = new Date();

    try {
        cache = await sheetReader.GetPlaylist();
        console.log(`Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);

    } catch (error) {
        console.log("Error updating cache", error);
    }



    setTimeout(() => {
        CacheUpdateAsync(seconds)
    }, time);
}

function CacheUpdate (seconds : number) {
    const time = seconds * 1000;
    const localTime = new Date();

    sheetReader.GetPlaylist().then((res) => {
        cache = res;
        console.log(`Cache updated @ ${localTime.getHours()}:${localTime.getMinutes()}:${localTime.getSeconds()}`);
    }).catch((err) => {
        console.log("Error updating cache", err);
    })


    setTimeout(() => {
        CacheUpdateAsync(seconds)
    }, time);
}


function NotFound(req, res, next) {
    res.status(404).send('404: Not found')
}


//#endregion


app.get('/api/visualized/readplaylist', async (req, res) => {
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

    if(Config.dataCaching && cache != null) {
        if(IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            res.status(503).send("503: API error.")
        } else {
            const inRangeCache = (i : number) => (i < cache.authors.length && i < cache.titles.length && i < cache.IDs.length);
            
            for (let i = 0; inRangeCache(i); i++) {;
                let elements = [cache.authors[i], cache.titles[i], cache.IDs[i]];

                table += `
                <tr>
                    <td>${elements[0]}</td>
                    <td>${elements[1]}</td>
                    <td>${elements[2]}</td>
                </tr>
                `
            }

            table += '</table>'

            table += `<br><p>Total track length:${cache.authors.length}</p>`
            table += `<style> td { font-family: 'Roboto', sans-serif; border: 1px solid black; background-color: #faedddfd} th { font-family: 'Secular One'; border: 1px solid black;} </style>`

            res.status(200).send(table);
        }
    } else {
        try {
            let response = await sheetReader.GetPlaylist();

            const inRange = (i : number) => (i < response.authors.length && i < response.titles.length && i < response.IDs.length);
            
            for (let i = 0; inRange(i); i++) {;
                let elements = [response.authors[i], response.titles[i], response.IDs[i]];

                table += `
                <tr>
                    <td>${elements[0]}</td>
                    <td>${elements[1]}</td>
                    <td>${elements[2]}</td>
                </tr>
                `
            }

            table += '</table>'
            table += `<br><p>Total track length:${response.authors.length}</p>`
            table += `<style> td { font-family: 'Roboto', sans-serif; border: 1px solid black; background-color: #faedddfd} th { font-family: 'Secular One'; border: 1px solid black;} </style>`
            res.status(200).send(table);

        } catch (error) {
            res.status(503).send("503: API error.")
        }

    }

})

app.use(NotFound);
