// We attach a symbol property instead of a string key property

import yaml from 'js-yaml';

// to avoid this property showing up in the generated YAML.
const Name = Symbol('name');
const Done = Symbol('done');
const AppliedBy = Symbol('applied-by');
const IsBuff = Symbol('is-buff');

/**
 * @param {Record<string, { id: number }>} records
 * @param {{ name: string, guid: number }} item
 */
function getKey(records, item) {
    let key = item.name
        .replaceAll(' ', '-')
        .replaceAll('\'', '')
        .toLowerCase();

    // We explicitly set the damage to undefined here
    // to ensure that the resulting JSON (YAML) has the property keys
    // in this order, always.
    // If we didn't do this, damage would always be last, which is undesirable.

    if (records[key] == null) {
        return key;
    }

    if (records[key].id !== item.guid) {
        let i = 1;

        while (records[`${key}-${i}`] != null && records[`${key}-${i}`].id !== item.guid) {
            i++;
        }

        key = `${key}-${i}`;
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

export class Durations {
    /** @type {number[]} */
    data;

    /** @param {number} duration */
    constructor(duration) {
        this.data = [duration];
    }

    dump() {
        return this.data.length === 1 ? this.data[0].toString() : yaml.dump(this.data, { schema, flowLevel: 0 }).trim();
    }
}

export const DurationsType = new yaml.Type('!format', {
    kind: 'scalar',
    resolve: () => false,
    instanceOf: Durations,
    /** @param {Durations} d */
    represent: d => d.dump()
})

export const schema = yaml.DEFAULT_SCHEMA.extend({ implicit: [DurationsType] })

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

        if (actions[key] == null) {
            actions[key] = { id: event.ability.guid, damage: undefined, description: 'Placeholder description for ' + event.ability.name, [Name]: event.ability.name };
        }

        const lastTimelineItem = timeline[timeline.length - 1];
        const lastAction = lastTimelineItem == null ? null : actions[lastTimelineItem.id];

        if (lastAction != null && lastAction[Name] === event.ability.name) {
            if (lastTimelineItem.id !== key || lastTimelineItem.at !== event.timestamp) {
                const at = event.timestamp + (event.duration ?? 0) - start - lastTimelineItem.at;

                if (at > 50 && !lastAction.children?.some(x => actions[x.id].id === event.ability.guid && isSameTimestamp(x.at, at))) {
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
 * @param {TargetabilityEvent[]} events
 * @param {TimelineEvent[]} timeline
 * @param {number} start
 */
function processTargetability(events, timeline, start) {
    for (const event of events) {
        if (event.targetable === 1) {
            timeline.push({ at: event.timestamp - start, id: '<targetable>' });
        } else {
            timeline.push({ at: event.timestamp - start, id: '<untargetable>' });
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

        if (event.unmitigatedAmount > 0 && (event.targetResources.hitPoints > 1 || event.unmitigatedAmount < 200000)
            && (event.mitigated == null || event.mitigated !== 1)
            && (action.damage == null || action.damage < event.unmitigatedAmount)) {
            // It seems like the mitigated value is "1" if an invuln such as Holmgang or Living Dead
            // was used. Needs further testing, but would be a good way to filter out inflated invuln damage.
            // We also test whether the target's HP are greater than 1 after this
            // damage event to ensure they didn't get hit while having a magic vuln,
            // which would heavily skew the results.

            action.damage = event.unmitigatedAmount;
        }
    }
}

/**
 * @param {StatusEvent[]} statuses
 * @param {Record<string, Action>} actions
 * @returns {Record<string, Status>}
 */
function processStatusEffects(statuses, actions) {
    /** @type {Record<string, Status & { [AppliedBy]: string[], [IsBuff]: boolean }>} */
    const status = {};
    const actionEntries = Object.entries(actions);
    
    for (const effect of statuses) {
        // fflogs guids for status effects always begin with "100"
        const statusId = Number.parseInt(effect.ability.guid.toString().slice(3));
        /** @type string | undefined */
        let appliedBy;

        if (effect.extraAbility != null) {
            const action = actionEntries.find(x => effect.extraAbility.guid === x[1].id);

            if (action != null) {
                appliedBy = `[a:${action[0]}]`;
            } else {
                appliedBy = effect.extraAbility.name;
            }
        }

        const key = getKey(status, { name: effect.ability.name, guid: statusId });

        if (status[key] == null) {
            status[key] = {
                id: statusId,
                duration: new Durations(effect.duration),
                description: '',
                [AppliedBy]: appliedBy != null ? [appliedBy] : [],
                [IsBuff]: effect.type === 'applybuff'
            };
        } else {
            const object = status[key];
            
            if (object.duration.data.every(x => Math.abs(effect.duration - x) > 500)) {
                object.duration.data.push(effect.duration);
            }

            if (appliedBy != null && !object[AppliedBy].includes(appliedBy)) {
                object[AppliedBy].push(appliedBy);
            }
        }
    }

    for (const key in status) {
        const appliedBy = status[key][AppliedBy];
        status[key].description = `${status[key][IsBuff] ? 'Applied' : 'Inflicted'} by ${appliedBy.length === 0 ? 'unknown' : appliedBy.join(', ')}`;
    }

    return status;
}

/**
 * @param {TimelineEvent[]} timeline
 * @param {Record<string, Action>} actions
 */
function postProcess(actions, timeline) {
    for (const id in actions) {
        const action = actions[id];

        if (action.damage == null && action.children != null && actions[action.children[0].id].damage != null && (action.children.length === 1 || action.children[0].id === action.children[1].id)) {
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
 * @typedef {{ timestamp: number, sourceID: number, targetID: number, targetable: number }} TargetabilityEvent
 * @typedef {{ timestamp: number, ability: Ability, unmitigatedAmount: number, mitigated?: number, absorbed?: number, blocked?: number, multiplier: number, targetResources: { hitPoints: number } }} DamageEvent
 * @typedef {{ id: number, description: string, children?: TimelineEvent[], count?: number, damage?: number, [Name]?: string }} Action
 * @typedef {{ at: number, id: string }} TimelineEvent
 * @typedef {{ ability: { name: string, guid: number }, extraAbility?: { name: string, guid: number }, duration: number, type: 'applydebuff' | 'applybuff' }} StatusEvent
 * @typedef {{ id: number, duration: Durations, description: string }} Status
 * @param {{ casts: CastEvent[], targetability: TargetabilityEvent[], damage: DamageEvent[], statuses: StatusEvent[], start: number }} param0
 */
export function processTimeline({ casts, targetability, damage, statuses, start }) {
    /** @type {Record<string, Action>} */
    const actions = {};
    /** @type {TimelineEvent[]} */
    const timeline = [];

    processCasts(casts, actions, timeline, start);
    processTargetability(targetability, timeline, start);
    processDamage(damage, actions);
    const status = processStatusEffects(statuses, actions);
    postProcess(actions, timeline);

    return {
        status,
        actions,
        timeline
    };
}
