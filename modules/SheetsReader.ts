import { SourceResponse, Object } from "./interfaces";

const { google } = require('googleapis');


      
module.exports = class SheetsReader {

    config = require('./config');
    private gSheets: any;
    private spreadsheetKey: string;
    rawResponse: object;
    playlist: SourceResponse;
    featuredPlaylist: SourceResponse;
    ranges: Array<string>;

    constructor(API_KEY, SHEET_KEY, RANGES=[`C3:C200`, `D3:D200`, `E3:E200`, `F3:F200`]) {
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
    public async MakeRequestAsync(cb : Function) {
        this.GetSpreadsheetValues((resp : object)=> { 
            this.rawResponse = resp;

            cb(resp);
        })
    }

     /**
     * Make request, returns callback.
     * @param {Function} cb callback made after finishing request
     */
    public MakeRequest(cb : Function) {
        this.GetSpreadsheetValues((resp)=> { 
            this.rawResponse = resp;
            cb(resp);
        })
    }

    public async GetSpreadsheetValues(callback : Function, {ranges, key} = {ranges: this.ranges, key: this.spreadsheetKey}) {
        let resp: object = null;

        this.gSheets.spreadsheets.values.batchGet({
            spreadsheetId: key,
            ranges: this.ranges
        }, (err : any, _resp : any) => {
            callback(_resp)
            resp = _resp
        });

    }

     /**
      * Get audio player playlist data
      */
    public async GetPlaylist() : Promise<SourceResponse> {
        await this.FormatAudioplayerValues();
        return this.playlist;
    }
    public async GetFeaturedPlaylist() : Promise<SourceResponse>
    {   
        await this.FormatAudioplayerValues({featured: true});
        return this.featuredPlaylist;
    }

    private async FormatAudioplayerValues({featured=false, debug=false}={}) {
        await this.MakeRequestAsync((d : any) => {
            const data = d.data.valueRanges;

            let emptyIndexes = []

            const response : SourceResponse = {
                authors: [],
                titles: [],
                IDs: [],
            }
            const featured_response : SourceResponse = {
                authors: [],
                titles: [],
                IDs: [],
            }

            const authors = data[0].values;
            const titles = data[1].values;
            const IDs = data[2].values;
            const isFeatured = [...data[3].values];

            const MapArray = () => {
                let featuredIndexes = new Set();

                if(isFeatured) {
                    isFeatured.forEach((value : string, i : Number) => {
                        if (value[0] === "T")
                            featuredIndexes.add(i);
                    })
                }
                
                authors.forEach((value : string, i : Number) => {
                    if (value[0] != '' && value[0] != undefined && !emptyIndexes.includes(i)) {
                        response.authors.push(value[0].toUpperCase())

                        if(featuredIndexes.has(i))
                        {
                            featured_response.authors.push(value[0].toUpperCase())
                        }

                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
        
                titles.forEach((value : string, i : Number) => {
                    if (value[0] != '' && value[0]!=undefined && !emptyIndexes.includes(i)) {
                        response.titles.push(value[0].toUpperCase())

                        if(featuredIndexes.has(i))
                        {
                            featured_response.titles.push(value[0].toUpperCase())
                        }
                    } else {
                        if (!emptyIndexes.includes(i))
                            emptyIndexes.push(i)
                    }
                });
                IDs.forEach((value : string, i : Number) => {
                    if (value[0] != '' && value[0]!=undefined &&!emptyIndexes.includes(i)) {
                        response.IDs.push(value[0])

                        if(featuredIndexes.has(i))
                        {
                            featured_response.IDs.push(value[0])
                        }

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

            if(featured == true) {
                this.featuredPlaylist = featured_response;
            }

            if(debug) {
                let table = [];
                console.log("Playlist updated!");

                this.playlist.authors.forEach((author,i) => {
                    const title = this.playlist.titles[i];
                    const ID = this.playlist.IDs[i];
                    table.push({author, title, ID})
                });

                if(featured) {
                    let feat_table = [];
                    console.log("Featured Playlist updated!");
                    this.featuredPlaylist.authors.forEach((author,i) => {
                        const title = this.featuredPlaylist.titles[i];
                        const ID = this.featuredPlaylist.IDs[i];
                        feat_table.push({author, title, ID})
                    });
                    console.table(feat_table);
                }
                console.table(table);
            }
        });
    }

}
