interface ApplicationConfig {
    dataCaching: boolean,
    cacheTime: number,
    corsEnabled: boolean,
    limitRequests: boolean,
    asyncCaching: boolean,
}

interface SourceResponse {
    authors: Array<string>,
    titles: Array<string>,
    IDs: Array<string>
}

export { ApplicationConfig, SourceResponse }