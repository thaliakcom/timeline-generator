import yaml from 'js-yaml';
import * as clipboard from './clipboard.mjs';

const text = process.argv[2] === 'clipboard' ? clipboard.read() : process.argv[2];
const adjustBy = Number(process.argv[3]);

if (Number.isNaN(adjustBy)) {
    throw new Error(`Invalid number '${process.argv[3]}'.`);
}

const json = yaml.load(text);

for (const item of json) {
    item.at += adjustBy;
}

const result = yaml.dump(json);

clipboard.write(result);

console.log(`Result copied to clipboard!`);
