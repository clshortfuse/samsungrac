import { readFileSync } from 'fs';
import Requester from '../utils/Requester.js';
import HttpsServer from '../utils/HttpsServer.js';
import HttpServer from '../utils/HttpServer.js';

/**
 * @typedef {Object} MIMH03DeviceOptions
 * @prop {string} ip
 * @prop {string} [token]
 * @prop {number} [httpPort=8080]
 * @prop {number} [httpsPort=8443]
 */

export default class MIMH03Device {
  /** @param {MIMH03DeviceOptions} options */
  constructor(options) {
    this.ip = options.ip;
    this.token = options.token;
    this.buildRequester();
    /** @type {HttpServer[]} */
    this.httpServers = [];
    this.httpsServer = new HttpsServer({
      minVersion: 'TLSv1',
      pfx: readFileSync('certs/private.pfx'),
      rejectUnauthorized: false,
    });
    this.httpPort = options.httpPort || 8080;
    this.httpsPort = options.httpPort || 8443;
  }

  buildRequester() {
    this.requester = new Requester({
      agent: false,
      host: this.ip,
      port: 8888,
      pfx: readFileSync('certs/private.pfx'),
      minVersion: 'TLSv1',
      rejectUnauthorized: false,
      headers: this.token ? {
        Authorization: `Bearer ${this.token}`,
      } : {},
    });
  }

  /** @return {Promise<{Devices:DeviceEntry[]}>} */
  async getDevices() {
    const devices = await this.requester.get('/devices');
    return /** @type {{Devices:DeviceEntry[]}} */ (devices);
  }

  /**
   * @param {DeviceEntry} device
   * @param {number} desired
   * @return {Promise<any>}
   */
  setTemperature(device, desired) {
    return this.requester.put(`/devices/${device.id}/temperatures/0`, {
      Temperature: { desired },
    });
  }

  /**
   * @param {DeviceEntry} device
   * @param {number} speedLevel
   * @return {Promise<any>}
   */
  setFanSpeed(device, speedLevel) {
    return this.requester.put(`/devices/${device.id}/wind`, {
      Wind: { speedLevel },
    });
  }

  /**
   * @param {DeviceEntry} device
   * @param {'Fix'|'Up_And_Low'} direction
   * @return {Promise<any>}
   */
  setFanDirection(device, direction) {
    return this.requester.put(`/devices/${device.id}/wind`, {
      Wind: { direction },
    });
  }

  /**
   * @param {DeviceEntry} device
   * @param {'Opmode_Cool'} mode
   * @return {Promise<any>}
   */
  async setMode(device, mode) {
    return this.requester.put(`/devices/${device.id}/mode`, {
      Mode: { modes: [mode] },
    });
  }

  /**
   * @return {Promise<string>}
   */
  async requestToken() {
    return new Promise((resolve, reject) => {
      this.httpsServer.server.on('request', /** @type {import('http').RequestListener} */ (req, res) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => {
          const json = JSON.parse(data);
          resolve(json.DeviceToken);
        });
        res.statusCode = 200;
        res.end('OK');
      });
      this.httpsServer.listen({
        host: '0.0.0.0',
        port: this.httpsPort,
      }).then(() => this.requester.post('/devicetoken/request')).catch(reject);
    });
  }

  async proxy() {
    const devices = await this.getDevices();
    const listeners = devices.Devices.map((device, index) => {
      const httpServer = new HttpServer({});
      /**
       * @param {import('http').IncomingMessage} req
       * @param {import('http').ServerResponse} res
       * @return {void}
       */
      const onRequest = (req, res) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => {
          const newUrl = (index === 0 ? req.url : `/devices/${device.id}${req.url}`);
          this.requester.sendRequest(newUrl, /** @type {any} */ (req.method), data)
            .then((result) => {
              const content = JSON.stringify(result);
              res.writeHead(200, {
                'Content-Length': content.length.toString(),
                'Content-Type': 'application/json; charset=utf-8',
              });
              res.end(content);
            }).catch((error) => {
              res.writeHead(error.statusCode || 500);
              res.end(error.message);
            });
        });
      };
      httpServer.server.on('request', onRequest);
      this.httpServers.push(httpServer);
      return httpServer.listen({ host: '0.0.0.0', port: this.httpPort + index });
    });
    await Promise.all(listeners);
  }
}

/** @typedef {{href:string}} LinkEntry */
/** @typedef {{href:string}} InformationLink */
/** @typedef {'On'|'Off'} OperationState */
/** @typedef {'Fahrenheit'|'Celsius'} TemperatureUnit */

/**
 * @typedef {Object} OperationEntry
 * @prop {OperationState} power
 * @prop {OperationState} [dhwPower]
 * @prop {OperationState} [ventilationPower]
 */

/**
 * @typedef {Object} TemperatureEntry
 * @prop {string} id
 * @prop {number} [current]
 * @prop {number} desired
 * @prop {number} increment
 * @prop {TemperatureUnit} unit
 * @prop {number} [maximum]
 * @prop {number} [minimum]
 * @prop {string} [name]
 */

/**
 * @typedef {Object} AlarmEntry
 * @prop {string} alarmType
 * @prop {string} code
 * @prop {string} id
 * @prop {string} triggeredTime
 */

/**
 * @typedef {Object} ModeEntry
 * @prop {string[]} supportedModes
 * @prop {string[]} modes
 * @prop {string[]} options
 */

/**
 * @typedef {Object} WindEntry
 * @prop {'Fix'|'Up_And_Low'} direction
 * @prop {number} speedLevel
 * @prop {string[]} supportedWindModes
 */

/**
 * @typedef {Object} DeviceEntry
 * @prop {string} id
 * @prop {string} description
 * @prop {string} name
 * @prop {string[]} resources
 * @prop {string} type
 * @prop {string} uuid
 * @prop {AlarmEntry[]} [Alarms]
 * @prop {LinkEntry} ConfigurationLink
 * @prop {LinkEntry} InformationLink
 * @prop {OperationEntry} Operation
 * @prop {TemperatureEntry[]} Temperatures
 * @prop {ModeEntry} [Mode]
 * @prop {WindEntry} [Wind]
 */
