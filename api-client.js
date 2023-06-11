import { FFLOGS_BASE_URL } from './constants.js';

export async function fetchTimeline(input) {
    const report = await (await fetch(`${FFLOGS_BASE_URL}v1/report/fights/${input.reportCode}?api_key=${input.key}`, { method: 'GET' })).json();

    if (report.error != null) {
        throw new Error(`Fetching of report ${input.reportCode} failed because ${report.error}.`);
    }

    if (!Array.isArray(report.fights) || report.fights.length < input.fightId) {
        throw new Error(`Could not find fight ID ${input.fightId} in report ${input.reportCode}.`);
    }

    const fight = report.fights[input.fightId - 1];
    const wipe = await (await fetch(`${FFLOGS_BASE_URL}v1/report/events/casts/${input.reportCode}?start=${fight.start_time}&end=${fight.end_time}&hostility=1&filter=type%3D%22begincast%22&api_key=${input.key}`, { method: 'GET' })).json();

    if (wipe.error != null) {
        throw new Error(`Fetching of fight ${reportCode}/${fight} failed because ${report.error}.`);
    }

    wipe.start = fight.start_time;
    wipe.end = fight.end_time;

    return wipe;
}
