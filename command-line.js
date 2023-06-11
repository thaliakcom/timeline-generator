import { REPORT_URL_CHUNK, FFLOGS_BASE_URL, FIGHT_URL_CHUNK } from './constants.js';

export function parseInput() {
    const reportUrl = process.argv[2];

    if (typeof reportUrl !== 'string' || !reportUrl.startsWith(FFLOGS_BASE_URL)) {
        throw new Error('Must specify a valid report URL.');
    }

    const keyArgIndex = process.argv.indexOf('--key');
    const key = process.argv[keyArgIndex + 1];

    if (keyArgIndex === -1 || key == null) {
        throw new Error('Must supply an API key using --key.');
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

    const reportCode = reportChunk.slice(0, fightIdIndex);

    return {
        reportCode,
        fightId,
        key
    };
}
