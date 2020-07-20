import { request } from 'https';

export default class Requester {
  /** @param {import('https').RequestOptions} options */
  constructor(options) {
    /** @type {import('https').RequestOptions} */
    this.options = { ...options };
  }

  /**
   * @param {string} path
   * @param {'GET'|'POST'|'PUT'} [method='GET'|'POST']
   * @param {Object} [content]
   * @return {Promise<Object>}
   */
  async sendRequest(path, method, content) {
    const parsedMethod = method ?? (content ? 'POST' : 'GET');
    const parsedContent = (content == null) ? '' : JSON.stringify(content);
    return new Promise((resolve, reject) => {
      const req = request({
        ...this.options,
        method: parsedMethod,
        headers: {
          ...this.options.headers,
          ...(parsedMethod === 'GET' ? null : {
            'Content-Length': parsedContent.length,
            'Content-Type': 'application/json',
          }),
        },
        path,
      });
      req.on('response', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (data && res.headers['content-type']?.toLowerCase()?.trim()?.startsWith('application/json')) {
              resolve(JSON.parse(data));
            } else {
              resolve(data);
            }
          } else {
            reject(new Error(`${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.end(parsedContent);
    });
  }

  /**
   * @param {string} path
   * @return {Promise<Object>}
   */
  async get(path) {
    return this.sendRequest(path);
  }

  /**
   * @param {string} path
   * @param {Object} [content]
   * @return {Promise<Object>}
   */
  async post(path, content) {
    return this.sendRequest(path, 'POST', content);
  }

  /**
   * @param {string} path
   * @param {Object} [content]
   * @return {Promise<Object>}
   */
  async put(path, content) {
    return this.sendRequest(path, 'PUT', content);
  }
}
