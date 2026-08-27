/**
 * VM Controller
 * Handlers for GCP Virtual Machine management endpoints.
 */

const { gcpFetch } = require('../services/gcpService');
const { handleError } = require('../middleware/errorMiddleware');

function instancePath({ project, zone, instance }) {
  return `/projects/${project}/zones/${zone}/instances/${instance}`;
}

async function getStatus(req, res) {
  try {
    const data = await gcpFetch(
      req.headers.authorization,
      instancePath(req.vmParams)
    );
    res.json({
      status: data.status,
      name: data.name,
      id: data.id,
      lastStartTimestamp: data.lastStartTimestamp,
      lastStopTimestamp: data.lastStopTimestamp,
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function getDetails(req, res) {
  try {
    const data = await gcpFetch(
      req.headers.authorization,
      instancePath(req.vmParams)
    );

    const machineType = data.machineType?.split('/').pop() || 'unknown';

    const networkInterfaces = (data.networkInterfaces || []).map((ni) => ({
      network: ni.network?.split('/').pop(),
      subnetwork: ni.subnetwork?.split('/').pop(),
      internalIp: ni.networkIP,
      externalIp: ni.accessConfigs?.[0]?.natIP || null,
      name: ni.name,
    }));

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
    handleError(res, err);
  }
}

function handleAction(action) {
  return async (req, res) => {
    try {
      const data = await gcpFetch(
        req.headers.authorization,
        `${instancePath(req.vmParams)}/${action}`,
        'POST'
      );
      res.json({ operation: data.name, status: data.status });
    } catch (err) {
      handleError(res, err);
    }
  };
}

async function getSerialPort(req, res) {
  try {
    const port = req.serialPort || parseInt(req.query.port, 10) || 1;
    const data = await gcpFetch(
      req.headers.authorization,
      `${instancePath(req.vmParams)}/serialPort?port=${port}`
    );
    res.json({
      contents: data.contents,
      start: data.start,
      next: data.next,
    });
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = {
  getStatus,
  getDetails,
  handleAction,
  getSerialPort,
};
