const tableBody = document.querySelector('#table tbody');
let buses = null;

const fetchBusData = async () => {
    try {
        const response = await fetch('/next-departure');
        if (!response.ok) throw new Error(`response returned ${response.status}`);
        return response.json();
    } catch (e) {
        console.log(`Error fetch bus data: ${e}`);
    }
}

const formatDate = (date) => date.toISOString().split('T')[0];
const formatTime = (date) => date.toTimeString().split(' ')[0].slice(0, 5);

const renderBusData = (buses) => {
    tableBody.textContent = '';
    for (const bus of buses) {
        const row = document.createElement('tr');
        const nextDepartureDateTimeUTC = new Date(`${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`);

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td>${formatDate(nextDepartureDateTimeUTC)}</td>
            <td>${formatTime(nextDepartureDateTimeUTC)}</td>
            <td>${bus.nextDeparture.remaining}</td>
        `;

        tableBody.append(row);
    }
}

const initWebSocket = () => {
    // WebSocket() - from the browser API
    const webSocket = new WebSocket(`wss://${location.host}`);

    webSocket.addEventListener('open', () => {
        console.log(`WebSocket connection opened: ${webSocket}`);
    });

    webSocket.addEventListener('message', (event) => {
        const buses = JSON.parse(event.data);
        renderBusData(buses);
    });

    webSocket.addEventListener('error', (error) => {
        console.log(`WebSocket error: ${error}`);
    });

    webSocket.addEventListener('close', () => {
        console.log('WebSocket closed');
    });
}

const updateTime = () => {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    currentTimeElement.textContent = now.toTimeString().split(' ')[0];

    setTimeout(() => updateTime(), 1000);
}

const init = async () => {
    try {
        buses = await fetchBusData();
        if (!buses.length) throw new Error('no data available');
        renderBusData(buses);

        initWebSocket();
        updateTime();
    } catch (e) {
        console.log(`Error init bus data: ${e}`);
    }
}

init();