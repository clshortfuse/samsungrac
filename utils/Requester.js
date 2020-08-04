import { request } from 'https';

export default class Requester {
  /** @param {import('https').RequestOptions} options */
  constructor(options) {
    /** @type {import('https').RequestOptions} */
    this.options = { ...options };
  }

  /**
   * @param {Object|string} content
   * @return {string}
   */
  static parseContentArgument(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return JSON.stringify(content);
  }

  /**
   * @param {string} path
   * @param {'GET'|'POST'|'PUT'} [method='GET'|'POST']
   * @param {Object|string} [content]
   * @return {Promise<Object>}
   */
  async sendRequest(path, method, content) {
    const parsedMethod = method ?? (content ? 'POST' : 'GET');
    const parsedContent = Requester.parseContentArgument(content);
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
            /** @type {Error & {statusCode:number}} */
            const error = (new Error(data));
            error.statusCode = res.statusCode;
            reject(error);
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
   * @param {Object|string} [content]
   * @return {Promise<Object>}
   */
  async post(path, content) {
    return this.sendRequest(path, 'POST', content);
  }

  /**
   * @param {string} path
   * @param {Object|string} [content]
   * @return {Promise<Object>}
   */
  async put(path, content) {
    return this.sendRequest(path, 'PUT', content);
  }
}
