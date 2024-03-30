$(document).ready(function() {

	let ws, refreshTimeout;

	const canvas = $('#connectedclients')[0];
	const ctx = canvas.getContext('2d');
	canvas.width = $('#connectedclients').width();
	canvas.height = $('#connectedclients').height();

	$('#connectedclients').mousemove(function(event) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({
				type: 'update-client-position',
				data: { x: event.offsetX, y: event.offsetY }
			}));
		}
	});

	$('footer > p:first').text(`Copyright © 2014-${new Date().getFullYear()}`);

	function connectWebSocket() {
		ws = new WebSocket(`wss://${window.location.hostname}`);

		ws.addEventListener('open', (event) => {
			console.log('WS Connected!');
		});

		ws.addEventListener('message', (event) => {
			const response = JSON.parse(event.data);
			switch (response.type) {
				case 'clients':
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					for (const client of response.data) {
						ctx.fillStyle = "#F1F1F1";
						ctx.beginPath();
						ctx.arc(client.x - 3, client.y - 3, 6, 0, 2 * Math.PI);
						ctx.fill();
						ctx.textBaseline = "top";
						ctx.font = "20px monospace";
						ctx.fillStyle = "#1B1C1D";
						ctx.fillRect(client.x + 3, client.y + 3, ctx.measureText(client.ip).width, 20);
						ctx.fillStyle = "#FFFFFF";
						ctx.fillText(client.ip, client.x + 5, client.y + 5);
					}
					break;
			}
		});

		ws.addEventListener('error', (event) => {
			console.error('WS Error!');
		});

		ws.addEventListener('close', (event) => {
			console.log('WS Disconnected! Attempting to reconnect...');
			clearTimeout(refreshTimeout);
			setTimeout(connectWebSocket, 4e3);
		});
	}

	connectWebSocket();
});