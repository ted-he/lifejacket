// Changes curving behavior of urgency
// LOG > SQRT > LIN > QUAD > EXP
var curveFunc = 'LOG';

// Modifies "aggressiveness" of anti-procrastination factor
var apAgression = 5;

getData().then((res) => {
    res.sort((a, b) => a.urgency - b.urgency);

    pushCards(res);
});

// Generates HTML for each card from data at stores it in an array
function genCards(data) {
    var html = [];

    // Generate inner HTML for each card
    for (var i = 0; i < data.length; i++)
        html.push(`<div class="bar" id=bar${i}></div>
                    <div class="card" id=card${i}>${data[i].course} | ${data[i].name}</div>`);

    return html;
}

function pushCards(data) {
    var html = genCards(data);
    var len = data.length;

    // Create a new card for each assignment
    for (var i = 0; i < len; i++) {
        // Create new <div>
        var newCard = document.createElement("div");

        // Set class to "base"
        newCard.className = "base";

        // Assign numbered id
        newCard.setAttribute("id", `base${i}`);

        // Replace inner HTML with card and bar
        newCard.innerHTML = html[i];

        // Add to document
        document.getElementById("grid").insertBefore(newCard, document.getElementById("addNew"));
        document.getElementById(`bar${i}`).style.background = getBarColor(data[i].urgency);
        document.getElementById(`bar${i}`).style.width = data[i].urgency > 90 ? "100%" : `${10 + data[i].urgency}%`;
    }
}

// Fades from green to red to dark red as urgency increases
function getBarColor(urgency) {
    // Green -> yellow
    if (urgency >= 0 && urgency <= 50)
        return `rgb(${urgency * 255 / 50}, 255, 0)`;

    // Yellow -> red
    if (urgency >= 0 && urgency <= 100)
        return `rgb(255, ${(100 - urgency) * 255 / 50}, 0)`;

    // Red -> black
    if (urgency > 100)
        return `rgb(${355 - urgency * 1.5}, 0, 0)`;
    return "#00ffff";
}

// Sends a request to the localhost (where the clientside proxy is running) for data
async function getData() {
    var out = null;

    await fetch(`http://localhost:5000/`)
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
                    course: t.properties.Course.select.name,
                    remaining: (end - Date.now()) / (end - start),
                    remaining_formatted: formatTime(end - start),
                    elapsed: (Date.now() - start) / (end - start),
                    deadline: end,
                    urgency: curve((Date.now() - start) / (end - start) * 100) * (apFactor += apAgression) / 100
                };
            });
        }).catch(e => console.error("Error: ", e));

    console.log(out);
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