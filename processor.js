export function processTimeline(timeline) {
    const actions = {};

    return {
        actions,
        timeline: timeline.events
            .filter(event => !event.ability.name.startsWith('unknown'))
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
