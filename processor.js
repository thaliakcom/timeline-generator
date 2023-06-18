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
                if (actions[event.ability.guid] == null) {
                    actions[event.ability.guid] = { description: 'Placeholder description for ' + event.ability.name };
                }

                return {
                    at: event.timestamp - timeline.start,
                    id: event.ability.guid
                };
            })
    }
}
