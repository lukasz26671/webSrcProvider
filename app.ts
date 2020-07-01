import {google} from 'googleapis'
import * as express from 'express'

const apikey = process.env.APIKEY
const port = process.env.PORT || 3300



const gSheets = google.sheets({
    version: "v4",
    auth: apikey
})

const app = express();

let httpServer = app.listen(port, ()=>{
    console.log(`Server running on port ${port}`)
})

app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin: https://lukasz26671.github.io')
    res.status(200)
});

app.get('/readplaylist', (req, res) => {
    res.setHeader('Content-Type', "application/json")
    res.setHeader('Access-Control-Allow-Origin', "*")
    console.log('Sent headers: ', res.headersSent)
    GetSources.then((data : SourceResponse) => {
        res.send(data)
    })
})

//#region API

interface SourceResponse {
    authors: Array<string>,
    titles: Array<string>,
    IDs: Array<string>
}

var GetSources = new Promise((resolve, reject) => {
    try {
        gSheets.spreadsheets.values.batchGet({
            spreadsheetId: '1JhbSnAQdcs4QGnCUx6fZ0ujV9G2k-Wjvs1YoTmoD2i0',
            ranges: ['C3:C60', 'D3:D90', 'E3:E90']
        }, (err, res) => {
            if(err) return console.log('Error ' + err)
        
            const response : SourceResponse = {
                "authors": [],
                "titles": [], 
                "IDs": []
            }
    
    
            res.data.valueRanges[0].values.forEach(value => {
                response.authors.push(value[0])
            });
            res.data.valueRanges[1].values.forEach(value => {
                response.titles.push(value[0])
            });
            res.data.valueRanges[2].values.forEach(value => {
                response.IDs.push(value[0])
            });
    
            response.authors.map(elem => elem.toUpperCase())
            response.titles.map(elem => elem.toUpperCase())
            response.IDs.map(elem => elem.toUpperCase())

            resolve(response)
        }) 
    } catch (error) {
        reject(error)
    }
})
//#endregion

