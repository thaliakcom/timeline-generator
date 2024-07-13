import yaml from 'js-yaml';
import * as clipboard from './clipboard.mjs';

// Can turn a YAML sequence of timeline items with absolute timestamps (relative to the start of the fight)
// into child timeline items where the timestamps are relative to the timestamp of the first item in the sequence.

const text = process.argv[2] === 'clipboard' ? clipboard.read() : process.argv[2];
const json = yaml.load(text);

const start = json[0].at;

for (const item of json) {
    item.at -= start;
}

const result = yaml.dump(json.slice(1));

clipboard.write(result);

console.log(`Result copied to clipboard!`);
