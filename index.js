import fs from 'fs';
import yaml from 'js-yaml';
import { parseInput } from './command-line.js';
import { fetchTimeline } from './api-client.js';
import { processTimeline } from './processor.js';

const KEY_QUOTES_REGEX = /  "(\d+)":/gm;

(async function() {
    try {
        const input = parseInput();
        const timeline = await fetchTimeline(input);
        const processed = processTimeline(timeline);
        const output = yaml.dump(processed, { quotingType: '"' })
            .replaceAll(KEY_QUOTES_REGEX, '  $1:');

        fs.mkdir('./timelines', undefined, () => {
            fs.writeFile(`./timelines/${input.reportCode}.yaml`, output, undefined, (err) => {
                if (err != null) {
                    console.error(err);
                } else {
                    console.log(`Successfully wrote the timeline to ./timelines/${input.reportCode}.yaml.`);
                }
            });
        });
    } catch (e) {
        console.error(e);
        return 1;
    }
})()
