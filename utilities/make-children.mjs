import yaml from 'js-yaml';
import * as clipboard from './clipboard.mjs';

const text = process.argv[2] === 'clipboard' ? clipboard.read() : process.argv[2];
const json = yaml.load(text);

const start = json[0].at;

for (const item of json) {
    item.at -= start;
}

const result = yaml.dump(json.slice(1));

clipboard.write(result);

console.log(`Result copied to clipboard!`);
