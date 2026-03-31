require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const http    = require('http');
const WebSocket = require('ws');
const path    = require('path');
const db      = require('./db');

const PORT = process.env.PORT || 3000;

const app = express();

// Security headers (CSP disabled — app uses inline scripts and is LAN-only)
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', async ws => {
  const data = await db.getAll();
  ws.send(JSON.stringify(data));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Display
app.get('/api/assignments', async (_req, res) => {
  try {
    res.json(await db.getAll());
  } catch (err) {
    console.error('GET /api/assignments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin page
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Create
app.post('/api/assignments', async (req, res) => {
  const { role, name, isLead } = req.body;
  if (!role?.trim() || !name?.trim()) {
    return res.status(400).json({ error: 'role and name are required' });
  }
  try {
    const row = await db.create({ role: role.trim(), name: name.trim(), isLead: !!isLead });
    broadcast(await db.getAll());
    res.status(201).json(row);
  } catch (err) {
    console.error('POST /api/assignments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update
app.put('/api/assignments/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { role, name, isLead } = req.body;
  if (!role?.trim() || !name?.trim()) {
    return res.status(400).json({ error: 'role and name are required' });
  }
  try {
    const row = await db.update(id, { role: role.trim(), name: name.trim(), isLead: !!isLead });
    if (!row) return res.status(404).json({ error: 'not found' });
    broadcast(await db.getAll());
    res.json(row);
  } catch (err) {
    console.error(`PUT /api/assignments/${id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete
app.delete('/api/assignments/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    await db.remove(id);
    broadcast(await db.getAll());
    res.status(204).end();
  } catch (err) {
    console.error(`DELETE /api/assignments/${id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await db.init();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
