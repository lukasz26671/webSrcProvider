export default interface ApplicationConfig {
    dataCaching: boolean,
    cacheTime: number,
    corsEnabled: boolean,
    limitRequests: boolean,
    asyncCaching: boolean,
}

export interface SourceResponse {
    authors: Array<string>,
    titles: Array<string>,
    IDs: Array<string>,
}
interface Object {
    filter(object: Object, predicate: any): Array<Object>
}