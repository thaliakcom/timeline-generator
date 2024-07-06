import { fetchBuilder, FileSystemCache } from 'node-fetch-cache';
import { FFLOGS_BASE_URL } from './constants.js';

const fetch = fetchBuilder.withCache(new FileSystemCache({ cacheDirectory: './cache', ttl: undefined }));
const CAST_FILTERS = 'type%21%3D%22begincast%22';
const TARGETABILITY_FILTERS = 'type%3D%22targetabilityupdate%22';
const DAMAGE_TAKEN_FILTERS = 'type%3D%22damage%22';
const DEBUFF_FILTERS = 'type%3D%22applydebuff%22';
const BUFF_FILTERS = 'type%3D%22applybuff%22';

/**
 * @param {{ reportCode: string, key: string, fightId: number }} input
 */
export async function fetchTimeline(input) {
    const report = await (await fetch(`${FFLOGS_BASE_URL}v1/report/fights/${input.reportCode}?api_key=${input.key}`, { method: 'GET' })).json();

    if (report.error != null) {
        throw new Error(`Fetching of report ${input.reportCode} failed because ${report.error}.`);
    }

    if (!Array.isArray(report.fights) || report.fights.length < input.fightId) {
        throw new Error(`Could not find fight ID ${input.fightId} in report ${input.reportCode}.`);
    }

    const fight = report.fights[input.fightId - 1];

    /**
     * @param {string} type
     * @param {number} hostility
     * @param {string} filters
     */
    async function fetchEvents(type, hostility, filters) {
        let response = {
            nextPageTimestamp: fight.start_time
        };

        const events = [];

        while (response.nextPageTimestamp != null && response.nextPageTimestamp < fight.end_time) {
            response = await (await fetch(`${FFLOGS_BASE_URL}v1/report/events/${type}/${input.reportCode}?start=${response.nextPageTimestamp}&end=${fight.end_time}&hostility=${hostility}&filter=${filters}&api_key=${input.key}`, { method: 'GET' })).json();
    
            if (response.error != null) {
                throw new Error(`Fetching of fight ${input.reportCode}/${fight} failed because ${report.error}.`);
            }
    
            events.push(...response.events);
        }

        return events;
    }

    const timeline = {
        start: fight.start_time,
        end: fight.end_time,
        casts: await fetchEvents('casts', 1, CAST_FILTERS),
        targetability: await fetchEvents('summary', 1, TARGETABILITY_FILTERS),
        damage: await fetchEvents('damage-taken', 0, DAMAGE_TAKEN_FILTERS),
        statuses: (await fetchEvents('debuffs', 0, DEBUFF_FILTERS)).concat(await fetchEvents('buffs', 1, BUFF_FILTERS))
    };

    return timeline;
}
