// We attach a symbol property instead of a string key property
// to avoid this property showing up in the generated YAML.
const Name = Symbol('name');
const Done = Symbol('done');

function getKey(actions, ability) {
    let key = ability.name
        .replaceAll(' ', '-')
        .replaceAll('\'', '')
        .toLowerCase();

    if (actions[key] == null) {
        actions[key] = { id: ability.guid, description: 'Placeholder description for ' + ability.name, [Name]: ability.name };
    }

    if (actions[key] != null && actions[key].id !== ability.guid) {
        let i = 1;

        while (actions[`${key}-${i}`] != null && actions[`${key}-${i}`].id !== ability.guid) {
            i++;
        }

        key = `${key}-${i}`;

        if (actions[key] == null) {
            actions[key] = { id: ability.guid, description: 'Placeholder description for ' + ability.name, [Name]: ability.name };
        }
    }

    return key;
}

function shouldFilter(lastEvent, currentEvent) {
    if (currentEvent.ability.name.startsWith('unknown') || currentEvent.ability.name === 'attack') {
        return true;
    }

    return false;
}

const TOLERANCE = 99;
function isSameTimestamp(at1, at2) {
    return Math.abs(at1 - at2) <= TOLERANCE;
}

export function processTimeline({ events, start }) {
    const actions = {};
    const timeline = [];
    let lastEvent;

    for (const event of events) {
        if (shouldFilter(lastEvent, event)) {
            continue;
        }

        lastEvent = event;

        const key = getKey(actions, event.ability);
        const lastTimelineItem = timeline[timeline.length - 1];
        const lastAction = lastTimelineItem == null ? null : actions[lastTimelineItem.id];

        if (lastAction != null && lastAction[Name] === event.ability.name) {
            if (lastTimelineItem.id !== key || lastTimelineItem.at !== event.at) {
                if (lastAction.children == null) {
                    lastAction.children = [];
                }
    
                const at = event.timestamp + (event.duration ?? 0) - start - lastTimelineItem.at;
    
                if (lastAction.id !== key && !lastAction.children.some(x => isSameTimestamp(x.at, at))) {
                    lastAction.children.push({
                        at,
                        id: key
                    });
                }

                continue;
            } else if (lastAction[Done] == null) {
                lastAction.count = lastAction.count == null ? 2 : lastAction.count + 1;
            }
        } else {
            timeline.push({
                at: event.timestamp + (event.duration ?? 0) - start,
                id: key
            });
        }

        if (lastAction != null) {
            lastAction[Done] = true;
        }
    }

    return {
        actions,
        timeline
    };
}
