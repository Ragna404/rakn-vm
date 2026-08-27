/**
 * GCP Compute Engine API Service
 * Forwards authenticated requests to Google Cloud REST API.
 */

const GCP_API_BASE = 'https://compute.googleapis.com/compute/v1';

async function gcpFetch(authHeader, gcpPath, method = 'GET', body = null) {
  const url = `${GCP_API_BASE}${gcpPath}`;
  const options = {
    method,
    headers: {
      Authorization: authHeader,
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

module.exports = { gcpFetch };
