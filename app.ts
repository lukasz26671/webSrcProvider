import {google} from 'googleapis'
import * as express from 'express'

const apikey = process.env.APIKEY
const port = process.env.PORT || 3300

const gSheets = google.sheets({
    version: "v4",
    auth: apikey || process.env.apikey
})

const app = express();

let httpServer = app.listen(port, ()=>{
    console.log(`Server running on port ${port}`)
})

app.get('/readplaylist', (req, res) => {
    res.header('Content-Type: application/json')
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
            ranges: ['C3:C60', 'D3:D60', 'E3:E60']
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
    
            resolve(response)
        }) 
    } catch (error) {
        reject(error)
    }
})


//#endregion