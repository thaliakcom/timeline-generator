import fs from 'fs';
import yaml from 'js-yaml';
import { parseInput } from './command-line.js';
import { fetchTimeline } from './api-client.js';
import { processTimeline } from './processor.js';

(async function() {
    try {
        const input = parseInput();
        const timeline = fetchTimeline(input);
        const processed = processTimeline(timeline);
        const output = yaml.dump(processed);

        fs.mkdir('./timelines', undefined, () => {
            fs.writeFile(`./timelines/${input.reportCode}.json`, output, undefined, (err) => {
                if (err != null) {
                    console.error(err);
                } else {
                    console.log(`Successfully wrote the timeline to ./timelines/${input.reportCode}.json.`);
                }
            });
        });
    } catch (e) {
        console.error(e);
        return 1;
    }
})()
