import yaml from 'js-yaml';

const text = process.argv[2];
const json = yaml.load(text);

const start = json[0].at;

for (const item of json) {
    item.at -= start;
}

const result = yaml.dump(json.slice(1));

console.log(`Result:\n${result}\n`);
