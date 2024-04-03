import 'dotenv/config';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { MongoClient, ServerApiVersion } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { PORT, MONGODB_URI } = process.env;

const app = express();
const mongo = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });
const clients = new Map();

app.locals.pretty = true;
app.set('trust proxy', true);
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.disable('x-powered-by');

const wss = new WebSocketServer({ 
	server: app.listen(PORT, () => { 
		console.log(`[${new Date().toISOString()}]: The NodeJS application (${path.basename(__dirname)}) is running on port ${PORT};`) 
	})
});

wss.on('connection', async (ws, req) => {

	clients.set(ws, { ip: req.headers['x-forwarded-for'].split(',')[0].trim(), x: null, y: null });

	setInterval(() => {
		try {
			if (ws.readyState === WebSocket.OPEN) ws.ping();
		} catch (error) {
			console.error(`[${new Date().toISOString()}]: ${error.message}`);
		}
	}, 20e3);

	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({
			type: 'clients',
			data: Array.from(clients).map(([key, value]) => ({ id: key, ip: value.ip, x: value.x, y: value.y }))
		}));
	}

	ws.on('message', async (message) => {
		const response = JSON.parse(message);
		switch (response.type) {
			case 'update-client-position':
				const clientData = clients.get(ws);

				if (clientData) {
					clientData.x = response.data.x;
					clientData.y = response.data.y;
				}

				wss.clients.forEach(client => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify({
							type: 'clients',
							data: Array.from(clients).map(([key, value]) => ({ id: key, ip: value.ip, x: value.x, y: value.y }))
						}));
					}
				});
				break;
		}
	});

	ws.on('close', () => {
		clients.delete(ws);
	});

	ws.on('error', (error) => {
		clients.delete(ws);
		console.error(`[${new Date().toISOString()}]: Websockets encountered an error (${error.message})`);
	});
});

wss.on('error', (error) => {
	console.error(`[${new Date().toISOString()}]: ${error.message}`);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

app.get('/weather', (req, res) => {
	res.sendFile(__dirname + '/views/weather.html');
});

app.get('/noscript', (req, res) => {
	res.sendFile(__dirname + '/views/noscript.html');
});

app.use('/robots.txt', (req, res) => {
	res.type('text/plain');
	res.send('User-agent: *\nDisallow: /');
});