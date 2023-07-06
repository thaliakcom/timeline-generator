export function processTimeline(timeline) {
    const actions = {};

    let precedingTimestamp = 0;

    return {
        actions,
        timeline: timeline.events
            .filter(event => {
                if (event.timestamp === precedingTimestamp) {
                    return false;
                }

                precedingTimestamp = event.timestamp;

                return !event.ability.name.startsWith('unknown');
            })
            .map(event => {
                const key = event.ability.name
                    .replaceAll(' ', '-')
                    .replaceAll('\'', '')
                    .toLowerCase();
                
                if (actions[key] == null) {
                    actions[key] = { description: 'Placeholder description for ' + event.ability.name, id: event.ability.guid };
                }

                return {
                    at: event.timestamp + (event.duration ?? 0) - timeline.start,
                    id: key
                };
            })
    }
}
