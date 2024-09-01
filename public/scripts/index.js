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
    for (const bus of buses) {
        const row = document.createElement('tr');
        const nextDepartureDateTimeUTC = new Date(`${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`);

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td>${formatDate(nextDepartureDateTimeUTC)}</td>
            <td>${formatTime(nextDepartureDateTimeUTC)}</td>
        `;

        tableBody.append(row);
    }
}

const init = async () => {
    try {
        buses = await fetchBusData();
        if (!buses.length) throw new Error('no data available');
        renderBusData(buses);
    } catch (e) {
        console.log(`Error init bus data: ${e}`);
    }

}

init();