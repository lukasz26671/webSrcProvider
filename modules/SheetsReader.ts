import { SourceResponse } from "./interfaces";

const { google } = require('googleapis');

module.exports = class SheetsReader {

    config = require('./config');
    private gSheets: any;
    private spreadsheetKey: string;
    rawResponse: object;
    playlist: SourceResponse;
    ranges: Array<string>;

    constructor(API_KEY, SHEET_KEY, RANGES=[`C3:C123`, `D3:D123`, `E3:E123`]) {
        this.BeginInitialization(API_KEY);
        this.spreadsheetKey = SHEET_KEY;
        this.ranges = RANGES;
    }

    private BeginInitialization(key: string) {
        this.gSheets = google.sheets({
            version: "v4",
            auth: key
        })
    }

    /**
     * Make asynchronous request, returns callback, usage of .then() is possible, although returns void.
     * @param {Function} cb  callback made after finishing request
     */
    public async MakeRequestAsync(cb) {
        this.GetSpreadsheetValues((resp)=> { 
            this.rawResponse = resp;

            cb(resp);
        })

        
    }

     /**
     * Make request, returns callback.
     * @param {Function} cb callback made after finishing request
     */
    public MakeRequest(cb) {
        this.GetSpreadsheetValues((resp)=> { 
            this.rawResponse = resp;
            cb(resp);
        })
    }

    public async GetSpreadsheetValues(callback, {ranges, key} = {ranges: this.ranges, key: this.spreadsheetKey}) {

        let canbreak: boolean = false;
        let resp: object = null;
        this.gSheets.spreadsheets.values.batchGet({
            spreadsheetId: key,
            ranges: this.ranges
        }, (err, _resp) => {
            callback(_resp)
            resp = _resp
        });

    }

     /**
      * Get audio player playlist data
      */
    public async GetPlaylist() {
        await this.FormatAudioplayerValues();
        return this.playlist;
    }

    private async FormatAudioplayerValues() {
        this.MakeRequestAsync((d) => {
            const data = d.data.valueRanges;

            let emptyIndexes = []

            const response :SourceResponse = {
                authors: [],
                titles: [],
                IDs: []
            }

            const authors = data[0].values;
            const titles = data[1].values;
            const IDs = data[2].values;

            const MapArray = () => {
                authors.forEach((value, i) => {
                    if (value[0] != '' && value[0]!=undefined && !emptyIndexes.includes(i)) {
                        response.authors.push(value[0].toUpperCase())
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
        
                titles.forEach((value, i) => {
                    if (value[0] != '' && value[0]!=undefined && !emptyIndexes.includes(i)) {
                        response.titles.push(value[0].toUpperCase())
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
                IDs.forEach((value, i) => {
                    if (value[0] != '' && value[0]!=undefined &&!emptyIndexes.includes(i)) {
                        response.IDs.push(value[0])
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });

                const inRange = (i : number) => (i < response.authors.length && i < response.titles.length && i < response.IDs.length);

                for (let i = 0; inRange(i); i++) {
                    if(emptyIndexes.includes(i)) {
                        response.authors.splice(i, 1);
                        response.titles.splice(i, 1);
                        response.IDs.splice(i, 1);

                        console.log(`Removed - ROWS(AUTHORS, TITLES, IDs) @ index ${i} from response`)
                    }
                }

            }
            
            MapArray();

            this.playlist = response;
        });
    }

}

