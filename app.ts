import { google } from 'googleapis'
import * as express from 'express'

const apikey = process.env.APIKEY
const port = process.env.PORT || 3300

const gSheets = google.sheets({
    version: "v4",
    auth: apikey
})

const app = express();

let httpServer = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin: *')
    res.status(200)
});

app.get('/readplaylist', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', "application/json")
    console.log('Sent headers: ', res.headersSent)

    let emptyIndexes = [];

    var GetSources = new Promise((resolve, reject) => {
        try {
            gSheets.spreadsheets.values.batchGet({
                spreadsheetId: '1JhbSnAQdcs4QGnCUx6fZ0ujV9G2k-Wjvs1YoTmoD2i0',
                ranges: ['C3:C123', 'D3:D123', 'E3:E123']
            }, (err, resp) => {
                
                if(err) {
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

    }).then((data: SourceResponse) => {
        res.status(302)
        res.send(data)
    }).catch((err) => {
        res.statusMessage = "500: API error";
        res.send( 
            res.statusMessage
        )
        res.statusCode = 500;
    })
})

//#region API

interface SourceResponse {
    authors: Array<string>,
    titles: Array<string>,
    IDs: Array<string>
}



//#endregion

