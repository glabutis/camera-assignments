require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { fetchAssignments } = require('./sheets');

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let currentData = [];

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify(currentData));
});

app.get('/api/assignments', (_req, res) => {
  res.json(currentData);
});

async function poll() {
  try {
    const data = await fetchAssignments();
    if (JSON.stringify(data) !== JSON.stringify(currentData)) {
      currentData = data;
      broadcast(currentData);
      console.log(`[${new Date().toISOString()}] Assignments updated (${data.length} roles)`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to fetch assignments:`, err.message);
  }
}

async function start() {
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s`);
  });
}

start();
