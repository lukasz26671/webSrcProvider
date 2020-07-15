const { google } = require('googleapis');
const express = require('express');
const cors = require('cors');
const { config } = require('./config.js');

const apikey = process.env.APIKEY
const port = process.env.PORT || 3300

const gSheets = google.sheets({
    version: "v4",
    auth: apikey
})

const app = express();

let lastRequestSuccessful = true;

if (config.corsEnabled)
    app.use(cors());

if (config.dataCaching) {
    if (config.cacheTime > 0)
        CacheUpdate(config.cacheTime)
    else
        CacheUpdate(600)
}

let httpServer = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin: *')
    res.status(200).send(`Everything is up and running! \n Last request: ${lastRequestSuccessful ? 'succeeded.' : 'failed.'} `)
});

function IsEmpty(arr : Array<any>) {
    return arr.length === 0 ? true : false;
}

var cache: SourceResponse = {
    authors: [],
    titles: [],
    IDs: []
}

app.get('/api/readplaylist', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")

    if(config.dataCaching && cache != null) {
        if(IsEmpty(cache.authors) || IsEmpty(cache.titles) && IsEmpty(cache.IDs)) {
            const _statusCode = 500;
            const _statusMessage = "API error."
            res.statusMessage = `${_statusCode}: ${_statusMessage}`;
            res.status(_statusCode).send(res.statusMessage)
        } else {
            res.status(302).send(cache);
        }
    } else {
        ApiRequest().then((data: SourceResponse) => {
            res.status(302).send(data)
        }).catch((err) => {
            const _statusCode = 500;
            const _statusMessage = "API error."
            res.statusMessage = `${_statusCode}: ${_statusMessage}`;
            res.status(_statusCode).send(res.statusMessage)
        })
    }
})

//#region API

/**
 * Odświeża cache na każdy określony cykl
 * ! Używać w kodzie tylko jednokrotnie, wielokrotność spowoduje rozdwojenie procesu.
 * TODO: Przerobienie na async/await.
 * @param seconds Czas w sekundach do odświeżenia cache
 * @returns void
 */
async function CacheUpdate(seconds: number) {
    let time = seconds * 1000;

    GetSourcesCache().then( (res : SourceResponse)=> {
        let time = new Date();
        cache = res;
        console.log(`Cache updated @ ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`);
    }).catch(err => {
        console.log(`Failed to update cache`, err);
    })

    setTimeout(() => {
        CacheUpdate(seconds)
    }, time);
}

interface SourceResponse {
    authors: Array<string>,
    titles: Array<string>,
    IDs: Array<string>
}

/** Wykonuje zapytanie przez API google sheets
 *  TODO: async/await
 *  @returns SourceResponse
 */
async function GetSourcesCache() {

    let response : SourceResponse;

    Promise.resolve(ApiRequest()).then((data: SourceResponse) => {
        response = data;
    })

    return response;
}

/** 
 *  todo: Polepszenie czytelności kodu, przerobienie promise na async/await
 *  @returns Promise
 */
async function ApiRequest() {
    return new Promise((resolve, reject) => {
        try {
            let emptyIndexes = [];

            gSheets.spreadsheets.values.batchGet({
                spreadsheetId: '1JhbSnAQdcs4QGnCUx6fZ0ujV9G2k-Wjvs1YoTmoD2i0',
                ranges: ['C3:C123', 'D3:D123', 'E3:E123']
            }, (err, resp) => {

                if (err) {
                    reject(err.message);
                    return;
                }

                const response: SourceResponse = {
                    "authors": [],
                    "titles": [],
                    "IDs": []
                }



                let i: number;
                resp.data.valueRanges[0].values.forEach(value => {
                    if (value[0] != '') {
                        response.authors.push(value[0])
                        i++;
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
                let j: number;
                resp.data.valueRanges[1].values.forEach(value => {
                    if (value[0] != '') {
                        response.titles.push(value[0])
                        j++;
                    } else {
                        if (!emptyIndexes.includes(j))
                            emptyIndexes.push(j)
                    }
                });
                let k: number;
                resp.data.valueRanges[2].values.forEach(value => {
                    if (value[0] != '') {
                        response.IDs.push(value[0])
                        k++;
                    } else {
                        if (!emptyIndexes.includes(k))
                            emptyIndexes.push(k)
                    }
                });


                i = 0;
                response.authors.map(elem => {
                    if (elem != '') i++
                    if (emptyIndexes.includes(i)) {
                        response.IDs.splice(i, 1);
                        console.log(`Removed - ROW(AUTHORS) @ index ${i} from response`)
                    }
                    return elem.toUpperCase();
                })
                j = 0;
                response.titles.map(elem => {
                    if (elem != '') j++
                    if (emptyIndexes.includes(j)) {
                        response.IDs.splice(j, 1);
                        console.log(`Removed - ROW(TITLES) @ index ${j} from response`)
                    }
                    return elem.toUpperCase();
                })
                k = 0;
                response.IDs.map(elem => {
                    if (elem != '') k++
                    if (emptyIndexes.includes(k)) {
                        response.IDs.splice(k, 1);
                        console.log(`Removed - ROW(IDS) @ index ${k} from response`)
                    }
                })
                resolve(response)
            })
        } catch (err) {
            reject(err);
        }

    })
}

/*
   ! Używać poprzez app.use() na końcu kodu
   TODO: Bardziej przejrzysty error message
*/
function NotFound(req, res, next) {
    res.status(404).send('404: Not found')
}

app.use(NotFound);

//#endregion

