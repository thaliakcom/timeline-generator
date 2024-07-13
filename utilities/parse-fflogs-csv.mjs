import * as csv from 'csv-parse/sync';
import * as clipboard from './clipboard.mjs';

// Can turn a list of fflogs CSV events into a YAML timeline item sequence.

const text = process.argv[2] === 'clipboard' ? clipboard.read() : process.argv[2];
const TIMESTAMP_REGEX = /(\d{2,}):(\d{2})\.(\d{3})/;
const CAST_TIME_REGEX = /\d+\.\d+ sec/;

let results = '';

for (const list of csv.parse(text)) {
    if (list[1] !== 'Cast') {
        continue;
    }

    const timestamp = parseTimestamp(list[0]);

    if (timestamp == null) {
        continue;
    }

    const castIndex = CAST_TIME_REGEX.exec(list[2])?.index;
    const id = (castIndex != null ? list[2].slice(0, castIndex - 1) : list[2]).toLowerCase().replaceAll(' ', '-');

    results += `- at: ${timestamp}\n  id: ${id}\n`;
}

function parseTimestamp(/** @type {string} */ timestamp) {
    const match = TIMESTAMP_REGEX.exec(timestamp);

    if (match == null) {
        return null;
    }

    const minutes = Number.parseInt(match[1]);
    const seconds = Number.parseInt(match[2]);
    const milliseconds = Number.parseInt(match[3]);

    return minutes * 60000 + seconds * 1000 + milliseconds;
}

clipboard.write(results);

console.log(`Result copied to clipboard!`);
