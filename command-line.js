import { REPORT_URL_CHUNK, FFLOGS_BASE_URL, FIGHT_URL_CHUNK } from './constants.js';

export function parseInput() {
    const args = process.argv.slice();
    const keyArgIndex = args.indexOf('--key');

    if (keyArgIndex === -1 || args[keyArgIndex + 1] == null) {
        throw new Error('Must supply an API key using --key.');
    }

    const key = args.splice(keyArgIndex, 2)[1];
    const reportUrl = args[2];

    if (typeof reportUrl !== 'string' || !reportUrl.startsWith(FFLOGS_BASE_URL)) {
        throw new Error('Must specify a valid report URL.');
    }

    const reportCodeIndex = reportUrl.indexOf(REPORT_URL_CHUNK);
    const reportChunk = reportUrl.slice(reportCodeIndex + REPORT_URL_CHUNK.length);

    if (reportCodeIndex === -1 || reportChunk.length === 0) {
        throw new Error('Must specify a valid report URL.');
    }

    const fightIdIndex = reportChunk.indexOf(FIGHT_URL_CHUNK);
    const fightId = Number.parseInt(reportChunk.slice(fightIdIndex + FIGHT_URL_CHUNK.length));

    if (fightIdIndex === -1 || Number.isNaN(fightId)) {
        throw new Error('The URL must be of a specific fight.');
    }

    const hashIndex = reportChunk.indexOf('#');
    const reportCode = reportChunk.slice(0, hashIndex);

    return {
        reportCode,
        fightId,
        key
    };
}
