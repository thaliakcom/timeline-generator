import yaml from 'js-yaml';
import clipboardy from 'clipboardy';

const text = process.argv[2] === 'clipboard' ? clipboardy.readSync() : process.argv[2];
const json = yaml.load(text);

const start = json[0].at;

for (const item of json) {
    item.at -= start;
}

const result = yaml.dump(json.slice(1));

clipboardy.writeSync(result);

console.log(`Result copied to clipboard!`);
