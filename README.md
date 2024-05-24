A simple command line utility that creates a rudimentary timeline file from an fflogs log. The script extracts the complete timeline from the log and fills the `actions` and `status` dictionaries as well.

Be aware that in order to use this utility an fflogs API V1 key is required. To get an fflogs API V1 key, go to [Settings](https://www.fflogs.com/profile) and scroll all the way down to the *Web API* header, then follow the instructions to create an API V1 key.

**Never share your API key with anyone else.**

Syntax:

```bash
node ./index.js https://www.fflogs.com/reports/REPORT_ID\#fight\=FIGHT_ID --key API_KEY
```

Example:

```bash
node ./index.js https://www.fflogs.com/reports/PpVHL4Djr1BNXWGJ#fight=15 --key [REDACTED]
```

## Utilities

In order to create a comprehensive timeline, it may be necessary to generate multiple timeline files from different pulls and then merge them, for instance because a certain boss action (like a phase's enrage cast) was completely skipped in the main log.
To merge multiple timelines, the scripts found in `utilities` may be helpful.

`adjust-timestamps.mjs` accepts a list of YAML timeline items and a timestamp offset, and adds the offset to every `at` field. Use `clipboard` as the input to read the input from the clipboard. Example: `node scripts/adjust-timestamps.mjs clipboard 4330` (offsets each timeline item by 4330ms)

`make-children.mjs` accepts a list of YAML timeline items and subtracts the *first* item's `at` value from each subsequent item. The output can then be used as the first action's `children`. Example: `node scripts/make-children.mjs clipboard`

Both scripts output their result to the clipboard.
