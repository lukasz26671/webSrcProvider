const { google } = require('googleapis');

module.exports = class SheetsReader {

    private gSheets = null;
    private spreadsheetKey = '1JhbSnAQdcs4QGnCUx6fZ0ujV9G2k-Wjvs1YoTmoD2i0';
    rawResponse;
    playlist;
    constructor(API_KEY) {
        this.BeginInitialization(API_KEY);
    }

    private BeginInitialization(key: string) {
        this.gSheets = google.sheets({
            version: "v4",
            auth: key
        })
    }

    public async MakeRequestAsync(cb) {
        this.GetSpreadsheetValues((resp)=> { 
            this.rawResponse = resp;

            cb(resp);
        })

        
    }

    public MakeRequest(cb) {
        this.GetSpreadsheetValues((resp)=> { 
            this.rawResponse = resp;

            cb(resp);
        })
    }

    private async GetSpreadsheetValues(callback, key = this.spreadsheetKey) {


        this.gSheets.spreadsheets.values.batchGet({
            spreadsheetId: key,
            ranges: ['C3:C123', 'D3:D123', 'E3:E123']
        }, (err, resp) => {
            callback(resp)
        });


    }

    public async GetPlaylist() {
        await this.FormatAudioplayerValues();
        return this.playlist;
    }

    private async FormatAudioplayerValues() {
        this.MakeRequestAsync((d) => {
            const data = d.data.valueRanges;

            let emptyIndexes = []

            const response = {
                authors: [],
                titles: [],
                IDs: []
            }

            const authors = data[0].values;
            const titles = data[1].values;
            const IDs = data[2].values;

            const MapArray = () => {
                authors.forEach((value, i) => {
                    if (value[0] != '' && !emptyIndexes.includes(i)) {
                        response.authors.push(value[0].toUpperCase())
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
        
                titles.forEach((value, i) => {
                    if (value[0] != '' && !emptyIndexes.includes(i)) {
                        response.titles.push(value[0].toUpperCase())
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
                IDs.forEach((value, i) => {
                    if (value[0] != '' && !emptyIndexes.includes(i)) {
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

