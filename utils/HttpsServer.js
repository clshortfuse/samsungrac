import { createServer } from 'https';

export default class HttpsServer {
  /** @param {import('https').ServerOptions} options */
  constructor(options) {
    this.options = { ...options };
    this.server = createServer(this.options);
  }

  /**
   * @param {import('net').ListenOptions} options
   * @return {Promise<void>}
   */
  async listen(options) {
    return new Promise((resolve, reject) => {
      this.server.addListener('error', reject);
      this.server.listen(options, () => {
        this.server.removeListener('error', reject);
        resolve();
      });
    });
  }

  /** @return {Promise<void>} */
  async stop() {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
