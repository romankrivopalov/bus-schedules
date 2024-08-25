import express from 'express';
import { readFile } from 'node:fs/promises'; // 'promises' for use 'await' in functions
import { DateTime } from 'luxon'; // to work with dates
import path from 'node:path';

const app = express();
const port = 3000;
const timeZone = 'UTC';

// when using 'type: module'
import url from 'node:url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -- when using 'type: module'

const loadBuses = async () => {
    const data = await readFile(path.join(__dirname, 'buses.json'), 'utf-8');

    return JSON.parse(data);
}

const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
    const now = DateTime
        .now()
        .setZone(timeZone);
    const [hours, minutes] = firstDepartureTime
        .split(':')
        .map(Number); // n => +n or n => Number(n)
    const endOfDay = DateTime
        .now()
        .set({ hours: 23, minutes: 59, seconds: 59 })
        .setZone(timeZone);
    // first departure
    let departure = DateTime
        .now()
        .set({ hours, minutes, seconds: 0, milliseconds: 0 })
        .setZone(timeZone);

    if (now > departure) departure = departure.plus({ minutes: frequencyMinutes });
    if (departure > endOfDay) departure = departure
        .startOf('day')
        .plus({ days: 1 })
        .set({ hours, minutes });

    while (now > departure) {
        departure = departure.plus({ minutes: frequencyMinutes });

        if (departure > endOfDay) departure = departure.startOf('day').plus({ days: 1 }).set({hours, minutes});
    }

    return departure;
}

const sendUpdateData = async (req, res) => {
    const busesData = await loadBuses();

    const updatedBuses = busesData.map(bus => {
        const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);

        return { ...bus,
            nextDeparture: {
                data: nextDeparture.toFormat('yyyy-MM-dd'),
                time: nextDeparture.toFormat('HH:mm:ss'),
            }
        }
    })

    return updatedBuses;
}

app.get('/next-departure', async (req, res) => {
    try {
        const updatedBuses = await loadBuses();

        res.send(await sendUpdateData());
    } catch (e) {
        res.send('Error');
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})