// Get these from Firebase DB later
var key = "secret_TErSOxpHrgxZUECA42JtSmf8oWxCGI789CSycvu3ZIA";
var databaseId = "c5034eb5e4da4562aea044afa8c47238";

// Changes curving behavior of urgency
// LOG > SQRT > LIN > QUAD > EXP
var curveFunc = 'LOG';

// Modifies "aggressiveness" of anti-procrastination factor
var apAgression = 5;

// Gets data for tasks
async function getData() {
    var out = null;

    // HTTP request options
    var options = {
        method: 'POST', // I don't know why it's post either, don't ask me
        headers: {
            'Notion-Version': '2022-06-28',
            'Authorization': key
        },
        body: {
            page_size: 100
        }
    };

    // Execute HTTP request to Notion API
    await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, options)
        .then(res => res.json())
        .then(res => {
            var tasks = res.results;

            // Sort entries in reverse chronological order
            tasks.sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time));

            // Anti-procrastination factor; inflates urgency of old tasks by a bit to encourage completion
            var apFactor = 100 - apAgression;

            out = tasks.map((t) => {
                // Get start and end times in milliseconds since Unix epoch
                var start = Date.parse(t.created_time);
                var end = Date.parse(t.properties.Deadline.date.start + 'T00:00:00.000Z');

                return {
                    name: t.properties.Name.title[0].plain_text,
                    remaining: (end - Date.now()) / (end - start),
                    remaining_formatted: formatTime(end - start),
                    elapsed: (Date.now() - start) / (end - start),
                    deadline: end,
                    urgency: curve((Date.now() - start) / (end - start) * 100) * (apFactor += apAgression) / 100
                };
            });
        }).catch(err => console.error("Error: ", err));

    return out;
}

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

    if (curveFunc === 'QUAD')
        // out = in^2 / 100
        return i * i / 100;

    if (curveFunc === 'EXP')
        // out = 10^(in / 50)
        return Math.pow(10, i / 50);

    // out = in
    return i;
}