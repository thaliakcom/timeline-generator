import fs from 'fs';
import yaml from 'js-yaml';
import { parseInput } from './command-line.js';
import { fetchTimeline } from './api-client.js';
import { processTimeline, schema } from './processor.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const KEY_QUOTES_REGEX = /  "(\d+)":/gm;

(async function() {
    try {
        const input = parseInput();
        const timeline = await fetchTimeline(input);
        const processed = processTimeline(timeline);
        const output = yaml.dump(processed, { quotingType: '"', lineWidth: Infinity, schema })
            .replaceAll(KEY_QUOTES_REGEX, '  $1:');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const timelineFolder = __dirname + '/timelines';

        fs.mkdir(timelineFolder, undefined, () => {
            fs.writeFile(`${timelineFolder}/${input.reportCode}.yaml`, output, undefined, (err) => {
                if (err != null) {
                    console.error(err);
                } else {
                    console.log(`Successfully wrote the timeline to ${timelineFolder}/${input.reportCode}.yaml.`);
                }
            });
        });
    } catch (e) {
        console.error(e);
        return 1;
    }
})()
