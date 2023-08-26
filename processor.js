// We attach a symbol property instead of a string key property
// to avoid this property showing up in the generated YAML.
const Name = Symbol('name');
const Done = Symbol('done');

/**
 * @param {Record<string, Action>} actions
 * @param {Ability} ability
 */
function getKey(actions, ability) {
    let key = ability.name
        .replaceAll(' ', '-')
        .replaceAll('\'', '')
        .toLowerCase();

    // We explicitly set the damage to undefined here
    // to ensure that the resulting JSON (YAML) has the property keys
    // in this order, always.
    // If we didn't do this, damage would always be last, which is undesirable.

    if (actions[key] == null) {
        actions[key] = { id: ability.guid, damage: undefined, description: 'Placeholder description for ' + ability.name, [Name]: ability.name };
        return key;
    }

    if (actions[key].id !== ability.guid) {
        let i = 1;

        while (actions[`${key}-${i}`] != null && actions[`${key}-${i}`].id !== ability.guid) {
            i++;
        }

        key = `${key}-${i}`;

        if (actions[key] == null) {
            actions[key] = { id: ability.guid, damage: undefined, description: 'Placeholder description for ' + ability.name, [Name]: ability.name };
        }
    }

    return key;
}

/**
 * @param {CastEvent} lastEvent
 * @param {CastEvent} currentEvent
 */
function shouldFilter(lastEvent, currentEvent) {
    if (currentEvent.ability.name.startsWith('unknown') || currentEvent.ability.name === 'attack') {
        return true;
    }

    return false;
}

const TOLERANCE = 99;
/**
 * @param {number} at1
 * @param {number} at2
 */
function isSameTimestamp(at1, at2) {
    return Math.abs(at1 - at2) <= TOLERANCE;
}

/**
 * @param {CastEvent[]} casts
 * @param {Record<string, Action>} actions
 * @param {TimelineEvent[]} timeline
 * @param {number} start
 */
function processCasts(casts, actions, timeline, start) {
    /** @type {CastEvent} */
    let lastEvent;

    for (const event of casts) {
        if (shouldFilter(lastEvent, event)) {
            continue;
        }

        lastEvent = event;

        const key = getKey(actions, event.ability);
        const lastTimelineItem = timeline[timeline.length - 1];
        const lastAction = lastTimelineItem == null ? null : actions[lastTimelineItem.id];

        if (lastAction != null && lastAction[Name] === event.ability.name) {
            if (lastTimelineItem.id !== key || lastTimelineItem.at !== event.timestamp) {
                const at = event.timestamp + (event.duration ?? 0) - start - lastTimelineItem.at;
    
                if (lastAction.id !== event.ability.guid && !lastAction.children?.some(x => isSameTimestamp(x.at, at))) {
                    if (lastAction.children == null) {
                        lastAction.children = [];
                    }

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
}

/**
 * @param {DamageEvent[]} events
 * @param {Record<string, Action>} actions
 */
function processDamage(events, actions) {
    /** @type {Record<string, string>} */
    const actionsById = {};

    for (const id in actions) {
        actionsById[actions[id].id] = id;
    }

    for (const event of events) {
        const key = actionsById[event.ability.guid];

        if (key == null) {
            continue;
        }

        const action = actions[key];

        if (event.unmitigatedAmount > 0 && (event.mitigated == null || event.mitigated !== 1)) {
            // It seems like the mitigated value is "1" if an invuln such as Holmgang or Living Dead
            // was used. Needs further testing, but would be a good way to filter out inflated invuln damage.

            if (action.damage == null || action.damage < event.unmitigatedAmount) {
                action.damage = event.unmitigatedAmount;
            }
        }
    }
}

/**
 * @param {TimelineEvent[]} timeline
 * @param {Record<string, Action>} actions
 */
function postProcess(actions, timeline) {
    for (const id in actions) {
        const action = actions[id];

        if (action.damage == null && action.children != null && actions[action.children[0].id].damage != null) {
            // Probably a cast and a damage event so we use the latter event.

            const child = action.children[0];
            const childAction = actions[child.id];
            const actionValues = Object.values(actions);

            if (action.children.length === 1) {
                action.children = undefined;
            } else {
                action.children.splice(0, 1);
            }

            action.damage = childAction.damage;

            for (const entry of timeline.concat(...actionValues.map(x => x.children ?? []))) {
                if (entry.id === id) {
                    entry.at += child.at;
                }
            }
            
            if (timeline.every(x => x.id !== child.id) && actionValues.every(x => x.children == null || x.children.every(x => x.id !== child.id))) {
                // Nothing is using this key anymore, so we can delete the action.
                delete actions[child.id];
            }
        }
    }

    timeline.sort((a, b) => a.at - b.at);
}

/** 
 * @typedef {{ guid: number, name: string }} Ability
 * @typedef {{ timestamp: number, duration?: number, ability: Ability }} CastEvent
 * @typedef {{ timestamp: number, ability: Ability, unmitigatedAmount: number, mitigated?: number, absorbed?: number, blocked?: number, multiplier: number }} DamageEvent
 * @typedef {{ id: number, description: string, children?: TimelineEvent[], count?: number, damage?: number, [Name]?: string }} Action
 * @typedef {{ at: number, id: string }} TimelineEvent
 * @param {{ casts: CastEvent[], damage: DamageEvent[], start: number }} param0
 */
export function processTimeline({ casts, damage, start }) {
    /** @type {Record<string, Action>} */
    const actions = {};
    /** @type {TimelineEvent[]} */
    const timeline = [];

    processCasts(casts, actions, timeline, start);
    processDamage(damage, actions);
    postProcess(actions, timeline);

    return {
        actions,
        timeline
    };
}
