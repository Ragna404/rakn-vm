const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// --- Mock fetch globally before requiring the app ---
// We mock the global fetch to simulate GCP API responses
// so tests run without real credentials.

const mockFetchResponses = new Map();

function setMockResponse(urlPattern, response, status = 200) {
  mockFetchResponses.set(urlPattern, { response, status });
}

function findMockResponse(url) {
  for (const [pattern, value] of mockFetchResponses) {
    if (url.includes(pattern)) return value;
  }
  return null;
}

global.fetch = async (url, options) => {
  const mock = findMockResponse(url);
  if (!mock) {
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: { message: `No mock for: ${url}` } }),
    };
  }
  return {
    ok: mock.status >= 200 && mock.status < 300,
    status: mock.status,
    json: async () => mock.response,
  };
};

const app = require('./server');

// =============================================
// Test Suite
// =============================================

describe('Server API', () => {
  before(() => {
    mockFetchResponses.clear();
  });

  // --- Parameter Validation ---

  describe('Parameter Validation', () => {
    it('GET /api/vm/status returns 400 without required params', async () => {
      const res = await request(app)
        .get('/api/vm/status')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('Missing required query params'));
    });

    it('GET /api/vm/status returns 400 with partial params', async () => {
      const res = await request(app)
        .get('/api/vm/status?project=my-proj&zone=us-central1-a')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });

    it('GET /api/vm/details returns 400 without params', async () => {
      const res = await request(app)
        .get('/api/vm/details')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });

    it('POST /api/vm/start returns 400 without params', async () => {
      const res = await request(app)
        .post('/api/vm/start')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });

    it('rejects path traversal in project param', async () => {
      const res = await request(app)
        .get('/api/vm/status?project=../admin&zone=us-central1-a&instance=my-vm')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('Invalid parameter'));
    });

    it('rejects special characters in instance name', async () => {
      const res = await request(app)
        .get('/api/vm/status?project=proj&zone=zone&instance=vm;rm+-rf')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });

    it('rejects empty string params', async () => {
      const res = await request(app)
        .get('/api/vm/status?project=&zone=z&instance=i')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });
  });

  // --- Serial Port Validation ---

  describe('Serial Port Validation', () => {
    it('rejects port number out of range', async () => {
      const res = await request(app)
        .get('/api/vm/serial-port?project=p&zone=z&instance=i&port=99')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('Port must be between'));
    });

    it('rejects negative port number', async () => {
      const res = await request(app)
        .get('/api/vm/serial-port?project=p&zone=z&instance=i&port=-1')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 400);
    });
  });

  // --- Auth Validation ---

  describe('Auth Validation', () => {
    it('GET /api/vm/status returns 401 without auth header', async () => {
      const res = await request(app)
        .get('/api/vm/status?project=p&zone=z&instance=i');

      assert.equal(res.status, 401);
      assert.ok(res.body.error.includes('Authorization'));
    });

    it('POST /api/vm/start returns 401 without auth header', async () => {
      const res = await request(app)
        .post('/api/vm/start?project=p&zone=z&instance=i');

      assert.equal(res.status, 401);
    });
  });

  // --- VM Status ---

  describe('GET /api/vm/status', () => {
    it('returns VM status when GCP responds successfully', async () => {
      setMockResponse('/instances/my-vm', {
        status: 'RUNNING',
        name: 'my-vm',
        id: '12345',
        lastStartTimestamp: '2026-01-01T00:00:00Z',
        lastStopTimestamp: null,
      });

      const res = await request(app)
        .get('/api/vm/status?project=my-proj&zone=us-central1-a&instance=my-vm')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'RUNNING');
      assert.equal(res.body.name, 'my-vm');
      assert.equal(res.body.id, '12345');
    });
  });

  // --- VM Details ---

  describe('GET /api/vm/details', () => {
    it('returns parsed VM details', async () => {
      setMockResponse('/instances/my-vm', {
        name: 'my-vm',
        id: '12345',
        status: 'RUNNING',
        machineType: 'projects/p/zones/z/machineTypes/e2-medium',
        zone: 'projects/p/zones/us-central1-a',
        creationTimestamp: '2026-01-01T00:00:00Z',
        lastStartTimestamp: '2026-01-02T00:00:00Z',
        cpuPlatform: 'Intel Haswell',
        networkInterfaces: [
          {
            network: 'projects/p/global/networks/default',
            subnetwork: 'projects/p/regions/us-central1/subnetworks/default',
            networkIP: '10.128.0.2',
            name: 'nic0',
            accessConfigs: [{ natIP: '34.56.78.90' }],
          },
        ],
        disks: [
          {
            source: 'projects/p/zones/z/disks/my-disk',
            diskSizeGb: '10',
            type: 'PERSISTENT',
            boot: true,
            mode: 'READ_WRITE',
            interface: 'SCSI',
          },
        ],
        tags: { items: ['http-server'] },
        labels: { env: 'dev' },
        metadata: { items: [{ key: 'startup-script', value: 'echo hello' }] },
        scheduling: {
          preemptible: false,
          automaticRestart: true,
          onHostMaintenance: 'MIGRATE',
        },
        serviceAccounts: [
          { email: 'sa@project.iam.gserviceaccount.com', scopes: ['cloud-platform'] },
        ],
      });

      const res = await request(app)
        .get('/api/vm/details?project=my-proj&zone=us-central1-a&instance=my-vm')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'my-vm');
      assert.equal(res.body.status, 'RUNNING');
      assert.equal(res.body.machineType, 'e2-medium');
      assert.equal(res.body.cpuPlatform, 'Intel Haswell');

      // Network parsing
      assert.equal(res.body.networkInterfaces.length, 1);
      assert.equal(res.body.networkInterfaces[0].internalIp, '10.128.0.2');
      assert.equal(res.body.networkInterfaces[0].externalIp, '34.56.78.90');
      assert.equal(res.body.networkInterfaces[0].network, 'default');

      // Disk parsing
      assert.equal(res.body.disks.length, 1);
      assert.equal(res.body.disks[0].name, 'my-disk');
      assert.equal(res.body.disks[0].sizeGb, '10');
      assert.equal(res.body.disks[0].boot, true);

      // Tags, labels
      assert.deepEqual(res.body.tags, ['http-server']);
      assert.deepEqual(res.body.labels, { env: 'dev' });
    });
  });

  // --- VM Actions ---

  describe('VM Actions', () => {
    const actions = ['start', 'stop', 'reset', 'suspend', 'resume'];

    for (const action of actions) {
      it(`POST /api/vm/${action} returns operation on success`, async () => {
        setMockResponse(`/${action}`, {
          name: `operation-${action}-123`,
          status: 'RUNNING',
        });

        const res = await request(app)
          .post(`/api/vm/${action}?project=p&zone=z&instance=i`)
          .set('Authorization', 'Bearer test-token');

        assert.equal(res.status, 200);
        assert.equal(res.body.operation, `operation-${action}-123`);
        assert.equal(res.body.status, 'RUNNING');
      });
    }
  });

  // --- Serial Port ---

  describe('GET /api/vm/serial-port', () => {
    it('returns serial output', async () => {
      setMockResponse('/serialPort', {
        contents: 'Boot log line 1\nBoot log line 2\n',
        start: '0',
        next: '1024',
      });

      const res = await request(app)
        .get('/api/vm/serial-port?project=p&zone=z&instance=i')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 200);
      assert.ok(res.body.contents.includes('Boot log'));
      assert.equal(res.body.next, '1024');
    });
  });

  // --- GCP Error Handling ---

  describe('GCP Error Handling', () => {
    it('forwards GCP API errors to client', async () => {
      setMockResponse('/instances/bad-vm', {
        error: { message: 'Instance not found', code: 404 },
      }, 404);

      const res = await request(app)
        .get('/api/vm/status?project=p&zone=z&instance=bad-vm')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Instance not found');
    });
  });

  // --- SPA Fallback ---

  describe('SPA Fallback', () => {
    it('serves index.html for unknown routes', async () => {
      const res = await request(app).get('/some/random/path');

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('html'));
      assert.ok(res.text.includes('OMARCHY'));
    });
  });

  // --- File System API ---

  describe('File System API', () => {
    it('GET /api/files/list returns directory items', async () => {
      const res = await request(app).get('/api/files/list?path=/home/user');
      assert.equal(res.status, 200);
      assert.equal(res.body.path, '/home/user');
      assert.ok(Array.isArray(res.body.items));
      assert.ok(res.body.items.some((i) => i.name === 'Documents'));
    });

    it('GET /api/files/read returns file content', async () => {
      const res = await request(app).get('/api/files/read?path=/home/user/Documents/architecture.md');
      assert.equal(res.status, 200);
      assert.ok(res.body.content.includes('Omarchy VM'));
    });

    it('POST /api/files/write saves new or edited content', async () => {
      const res = await request(app)
        .post('/api/files/write')
        .send({ path: '/home/user/Documents/test-note.txt', content: 'hello world from tests' });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });

    it('GET /api/files/list returns 404 for non-existent path', async () => {
      const res = await request(app).get('/api/files/list?path=/non/existent/folder');
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });

    it('GET /api/files/read returns 400 when path is missing', async () => {
      const res = await request(app).get('/api/files/read');
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Missing required query param: path');
    });

    it('GET /api/files/read returns 404 for non-existent file', async () => {
      const res = await request(app).get('/api/files/read?path=/home/user/Documents/missing.txt');
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });

    it('GET /api/files/read returns 400 when reading a directory', async () => {
      const res = await request(app).get('/api/files/read?path=/home/user/Documents');
      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('Cannot read directory'));
    });

    it('POST /api/files/write returns 400 when path is missing', async () => {
      const res = await request(app)
        .post('/api/files/write')
        .send({ content: 'no path' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Missing required body param: path');
    });

    it('POST /api/files/write returns 404 when parent dir does not exist', async () => {
      const res = await request(app)
        .post('/api/files/write')
        .send({ path: '/non/existent/parent/file.txt', content: 'test' });
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });

    it('handles paths with trailing slash correctly in list and read', async () => {
      const res = await request(app).get('/api/files/list?path=/home/user/Documents/');
      assert.equal(res.status, 200);
      assert.equal(res.body.path, '/home/user/Documents');
    });
  });

  // --- Edge Cases & Error Handling ---

  describe('Edge Cases & Error Handling', () => {
    it('GET /api/vm/details handles instances with minimal/null fields gracefully', async () => {
      setMockResponse('/instances/minimal-vm', {
        name: 'minimal-vm',
        id: '123',
        status: 'RUNNING',
      });

      const res = await request(app)
        .get('/api/vm/details?project=p&zone=z&instance=minimal-vm')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'minimal-vm');
      assert.equal(res.body.machineType, 'unknown');
      assert.deepEqual(res.body.networkInterfaces, []);
      assert.deepEqual(res.body.disks, []);
    });

    it('handles GCP error without custom message', async () => {
      setMockResponse('/instances/generic-error', {}, 500);

      const res = await request(app)
        .get('/api/vm/status?project=p&zone=z&instance=generic-error')
        .set('Authorization', 'Bearer test-token');

      assert.equal(res.status, 500);
      assert.ok(res.body.error);
    });

    it('masks 500 errors in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { handleError } = require('./src/middleware/errorMiddleware');
      let capturedStatus = null;
      let capturedBody = null;
      const mockRes = {
        status(code) { capturedStatus = code; return this; },
        json(data) { capturedBody = data; return this; },
      };

      handleError(mockRes, { status: 500, message: 'Database connection failed: secret_pw@10.0.0.1' });
      assert.equal(capturedStatus, 500);
      assert.equal(capturedBody.error, 'Internal server error');

      // Test 400 error in production passes message through
      handleError(mockRes, { status: 400, message: 'Invalid input' });
      assert.equal(capturedStatus, 400);
      assert.equal(capturedBody.error, 'Invalid input');

      process.env.NODE_ENV = originalEnv;
    });

    it('gcpFetch serializes body when provided', async () => {
      const { gcpFetch } = require('./src/services/gcpService');
      setMockResponse('/test-post', { success: true });

      const result = await gcpFetch('Bearer token', '/test-post', 'POST', { key: 'value' });
      assert.deepEqual(result, { success: true });
    });
  });
});


