import express from 'express';
import { readFile } from 'node:fs/promises'; // 'promises' for use 'await' in functions
import { DateTime, Duration } from 'luxon'; // to work with dates
import path from 'node:path';

const app = express();
const port = 3000;
const timeZone = 'UTC';

// when using 'type: module'
import url from 'node:url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -- when using 'type: module'

// init webSocket
import { WebSocketServer } from 'ws';
const webSocketServer = new WebSocketServer({noServer: true});
const clients = new Set()
// -- init webSocket

// init frontend
app.use(express.static(path.join(__dirname, 'public')));

const loadBuses = async () => {
    const data = await readFile(path.join(__dirname, 'buses.json'), 'utf-8');

    return JSON.parse(data);
}

const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
    const now = DateTime
        .now()
        .setZone(timeZone);
    const [hour, minute] = firstDepartureTime
        .split(':')
        .map(Number); // n => +n or n => Number(n)
    const endOfDay = DateTime
        .now()
        .set({ hour: 23, minute: 59, second: 59 })
        .setZone(timeZone);
    // first departure
    let departure = DateTime
        .now()
        .set({ hour, minute, second: 0, millisecond: 0 })
        .setZone(timeZone);

    if (now > departure) departure = departure.plus({ minutes: frequencyMinutes });
    if (departure > endOfDay) departure = departure
        .startOf('day')
        .plus({ days: 1 })
        .set({ hour, minute });

    while (now > departure) {
        departure = departure.plus({ minutes: frequencyMinutes });

        if (departure > endOfDay) departure = departure
            .startOf('day')
            .plus({ days: 1 })
            .set({ hour, minute });
    }

    return departure;
}

const sendUpdateSortedData = async () => {
    const busesData = await loadBuses();
    const now = DateTime.now().setZone(timeZone);

    const updatedBuses = busesData.map(bus => {
        const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);
        const timeRemaining = Duration.fromMillis(nextDeparture.diff(now).toMillis());

        return { ...bus, nextDeparture: {
                date: nextDeparture.toFormat('yyyy-MM-dd'),
                time: nextDeparture.toFormat('HH:mm:ss'),
                remaining: timeRemaining < 60000 ? 'Отправляется' : timeRemaining.toFormat('hh:mm:ss'),
            }
        }
    })

    return sortBuses(updatedBuses);
}

const sortBuses = (buses) => [...buses].sort((a, b) =>
    new Date(`${a.nextDeparture.date}T${a.nextDeparture.time}`) -
    new Date(`${b.nextDeparture.date}T${b.nextDeparture.time}`)
);

app.get('/next-departure', async (req, res) => {
    try {
        const updatedBuses = await sendUpdateSortedData();
        res.send(updatedBuses);
    } catch (e) {
        res.send('Error');
    }
});

webSocketServer.on('connection', (ws) => {
    console.log('WebSocket connection connected');
    clients.add(ws);

    const sendUpdates = async () => {
        try {
            const updatedBuses = await sendUpdateSortedData();
            ws.send(JSON.stringify(updatedBuses));
        } catch (e) {
            console.log('Error websocket connection');
        }
    }

    const intervalId = setInterval(sendUpdates, 1000);

    ws.on('close', () => {
        clearInterval(intervalId);
        clients.delete(ws);
        console.log('WebSocket connection disconnected');
    })
})

const server = app.listen(port, () => {
    console.log(`App listening on http://localhost:${port}`);
});

server.on('upgrade', (req, socket, head) => {
    webSocketServer.handleUpgrade(req, socket, head, (ws) => {
        // after upgrade the connection, the event connection is called
        webSocketServer.emit('connection', ws, req);
    })
})