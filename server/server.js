const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- GCP Compute Engine API Base ---
const GCP_API_BASE = 'https://compute.googleapis.com/compute/v1';

/**
 * Proxy helper: forwards the user's OAuth2 token to GCP API.
 * All VM endpoints require query params: project, zone, instance.
 */
async function gcpFetch(req, gcpPath, method = 'GET', body = null) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw { status: 401, message: 'Missing Authorization header' };
  }

  const url = `${GCP_API_BASE}${gcpPath}`;
  const options = {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.error?.message || 'GCP API error',
      details: data.error,
    };
  }

  return data;
}

/**
 * Extract and validate VM params from query string.
 */
function getVmParams(req) {
  const { project, zone, instance } = req.query;
  if (!project || !zone || !instance) {
    throw {
      status: 400,
      message: 'Missing required query params: project, zone, instance',
    };
  }
  return { project, zone, instance };
}

// --- API Routes ---

// GET /api/vm/status - Get VM instance status
app.get('/api/vm/status', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}`
    );
    res.json({
      status: data.status,
      name: data.name,
      id: data.id,
      lastStartTimestamp: data.lastStartTimestamp,
      lastStopTimestamp: data.lastStopTimestamp,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/vm/details - Get full VM details
app.get('/api/vm/details', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}`
    );

    // Parse machine type from URL
    const machineType = data.machineType?.split('/').pop() || 'unknown';

    // Extract network interfaces
    const networkInterfaces = (data.networkInterfaces || []).map((ni) => ({
      network: ni.network?.split('/').pop(),
      subnetwork: ni.subnetwork?.split('/').pop(),
      internalIp: ni.networkIP,
      externalIp: ni.accessConfigs?.[0]?.natIP || null,
      name: ni.name,
    }));

    // Extract disks
    const disks = (data.disks || []).map((d) => ({
      name: d.source?.split('/').pop(),
      sizeGb: d.diskSizeGb,
      type: d.type,
      boot: d.boot,
      mode: d.mode,
      interface: d.interface,
    }));

    res.json({
      name: data.name,
      id: data.id,
      status: data.status,
      machineType,
      zone: data.zone?.split('/').pop(),
      creationTimestamp: data.creationTimestamp,
      lastStartTimestamp: data.lastStartTimestamp,
      lastStopTimestamp: data.lastStopTimestamp,
      networkInterfaces,
      disks,
      tags: data.tags?.items || [],
      labels: data.labels || {},
      metadata: data.metadata?.items || [],
      cpuPlatform: data.cpuPlatform,
      scheduling: {
        preemptible: data.scheduling?.preemptible || false,
        automaticRestart: data.scheduling?.automaticRestart || false,
        onHostMaintenance: data.scheduling?.onHostMaintenance,
      },
      serviceAccounts: (data.serviceAccounts || []).map((sa) => ({
        email: sa.email,
        scopes: sa.scopes,
      })),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/vm/start - Start the VM
app.post('/api/vm/start', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/start`,
      'POST'
    );
    res.json({ operation: data.name, status: data.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/vm/stop - Stop the VM
app.post('/api/vm/stop', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/stop`,
      'POST'
    );
    res.json({ operation: data.name, status: data.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/vm/reset - Reset the VM
app.post('/api/vm/reset', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/reset`,
      'POST'
    );
    res.json({ operation: data.name, status: data.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/vm/suspend - Suspend the VM
app.post('/api/vm/suspend', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/suspend`,
      'POST'
    );
    res.json({ operation: data.name, status: data.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/vm/resume - Resume the VM
app.post('/api/vm/resume', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/resume`,
      'POST'
    );
    res.json({ operation: data.name, status: data.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/vm/serial-port - Get serial port output
app.get('/api/vm/serial-port', async (req, res) => {
  try {
    const { project, zone, instance } = getVmParams(req);
    const port = req.query.port || 1;
    const data = await gcpFetch(
      req,
      `/projects/${project}/zones/${zone}/instances/${instance}/serialPort?port=${port}`
    );
    res.json({
      contents: data.contents,
      start: data.start,
      next: data.next,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// --- SPA Fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`\n  OMARCHY VM Server`);
  console.log(`  Listening on http://localhost:${PORT}\n`);
});
