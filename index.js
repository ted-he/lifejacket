const { Client } = require('@notionhq/client');
const { makeConsoleLogger } = require('@notionhq/client/build/src/logging');

const notion = new Client({ auth: "secret_TErSOxpHrgxZUECA42JtSmf8oWxCGI789CSycvu3ZIA" });

var curveFunc = 'LOG';

(async () => {
    const databaseId = 'c5034eb5e4da4562aea044afa8c47238';
    notion.databases.query(
        {
            database_id: databaseId,
            filter: {
                property: 'Status',
                status: {
                    does_not_equal: "Completed"
                }
            }
        }
    ).then((res) => {
        var entries = res.results;

        // Sort entries in reverse chronological order
        entries.sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time));

        // Anti-procrastination factor
        apFactor = 95;

        var out = entries.map((e) => {
            var start = Date.parse(e.created_time);
            var end = Date.parse(e.properties.Deadline.date.start + 'T00:00:00.000Z');

            return {
                name: e.properties.Name.title[0].plain_text,
                remaining: (end - Date.now()) / (end - start),
                remaining_formatted: formatTime(end - start),
                elapsed: (Date.now() - start) / (end - start),
                deadline: end,
                urgency: curve((Date.now() - start) / (end - start) * 100) * (apFactor += 5) / 100
            };
        });

        console.log(out);

        console.log(formatTime(Date.now()));
    });
})();

// Formats time into minutes, hours, and days. Use only for time intervals, and not dates.
function formatTime(time) {
    time /= 60000;
    var min = Math.trunc(time) % 60;

    time /= 60;
    var hr = Math.trunc(time) % 24;

    time /= 24;
    var days = Math.trunc(time);

    return `${days}d ${hr}h ${min}m`;
}

// Curves a number between 0 and 100 to somewhere else between 0 and 100, depending on constant.
function curve(i) {
    if (curveFunc === 'LOG')
        // out = 50 * log_10(in), but uses sqrt function if this is lower than sqrt.
        return Math.log10(i) * 50 < Math.sqrt(i) * 10 ? Math.sqrt(i) * 10 : Math.log10(i) * 50;
    if (curveFunc === 'SQRT')
        // out = 10 * sqrt(in)
        return Math.sqrt(i) * 10;
    // out = in
    return i;
}