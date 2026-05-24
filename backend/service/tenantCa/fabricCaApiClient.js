const https = require('https');

class FabricCaApiClient {
  constructor(caUrl) {
    const urlStr = caUrl.includes('://') ? caUrl : `https://${caUrl}`;
    const url = new URL(urlStr);
    this.hostname = url.hostname;
    this.port = url.port ? parseInt(url.port, 10) : 443;
  }

  async enroll(enrollmentId, enrollmentSecret, csr, caname) {
    const basicAuth = Buffer.from(`${enrollmentId}:${enrollmentSecret}`).toString('base64');
    const body = { certificate_request: csr };
    if (caname) body.caname = caname;

    return this.post('/api/v1/enroll', JSON.stringify(body), {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }

  async getCAInfo(caname) {
    const path = caname ? `/api/v1/cainfo?ca=${caname}` : '/api/v1/cainfo';
    return this.get(path);
  }

  post(path, body, headers) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.hostname,
        port: this.port,
        path,
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  get(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.hostname,
        port: this.port,
        path,
        method: 'GET',
        rejectUnauthorized: false,
      };

      https
        .get(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = { FabricCaApiClient };
