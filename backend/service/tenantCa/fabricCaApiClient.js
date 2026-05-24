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

  async getCAChainPem(caname) {
    const info = await this.getCAInfo(caname);
    if (!info.success || !info.result?.CAChain) {
      throw new Error(
        `Failed to read CA chain${caname ? ` for ${caname}` : ''}: ${JSON.stringify(info.errors)}`,
      );
    }
    return Buffer.from(info.result.CAChain, 'base64').toString('utf-8');
  }

  async addAffiliation(adminId, adminSecret, name, caname) {
    const body = { name };
    let path = '/api/v1/affiliations';
    if (caname) path += `?ca=${encodeURIComponent(caname)}`;

    const basicAuth = Buffer.from(`${adminId}:${adminSecret}`).toString('base64');
    return this.post(path, JSON.stringify(body), {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }

  async register(adminId, adminSecret, id, secret, options = {}) {
    const body = {
      id,
      secret,
      type: options.type || 'client',
    };
    if (options.affiliation) body.affiliation = options.affiliation;
    if (options.attrs) body.attrs = options.attrs;
    if (options.max_enrollments != null) body.max_enrollments = options.max_enrollments;

    let path = '/api/v1/register';
    if (options.caname) path += `?ca=${encodeURIComponent(options.caname)}`;

    const basicAuth = Buffer.from(`${adminId}:${adminSecret}`).toString('base64');
    return this.post(path, JSON.stringify(body), {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
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
