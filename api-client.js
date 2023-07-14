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
    const timeline = {
        start: fight.start_time,
        end: fight.end_time,
        events: []
    };
    let casts = {
        nextPageTimestamp: timeline.start
    };

    while (casts.nextPageTimestamp != null && casts.nextPageTimestamp < timeline.end) {
        casts = await (await fetch(`${FFLOGS_BASE_URL}v1/report/events/casts/${input.reportCode}?start=${casts.nextPageTimestamp}&end=${fight.end_time}&hostility=1&api_key=${input.key}`, { method: 'GET' })).json();

        if (casts.error != null) {
            throw new Error(`Fetching of fight ${reportCode}/${fight} failed because ${report.error}.`);
        }

        timeline.events.push(...casts.events);
    }

    return timeline;
}
