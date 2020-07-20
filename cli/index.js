import { argv, stdout, exit } from 'process';
import MIMH03Device from '../devices/mim-h03.js';

const argumentList = [
  ['ip', 'Samsung RAC device IP address'],
  ['token', 'Device token used for authentication'],
  ['id', 'Sub device id'],
  ['name', 'Sub device name'],
  ['info', 'Output device info'],
  ['temp', 'Desired temperature'],
  ['mode', 'Desired mode'],
  ['speed', 'Desired fan speed'],
  ['requesttoken', 'Listens for and requests device token'],
];

/**
 * @param {string} [s='']
 * @param {number} [length=0]
 * @prop {string} [char=' ']
 * @return {string}
 */
function padEnd(s = '', length = 0, char = ' ') {
  let r = s;
  while (r.length < length) r += char;
  return r;
}

const args = argv.slice(2);
/** @type {Map<string,string>} */
const entries = new Map();
if (!args.length) {
  stdout.write('USAGE: samsungrac [OPTION]...\n');
  stdout.write('Perform variation operations against a Samsung RAC device.\n');
  stdout.write('\n');

  const padSize = Math.max(...argumentList.map(([arg]) => arg.length));

  argumentList.forEach(([arg, description]) => {
    stdout.write(`  --${padEnd(arg, padSize)}  ${description}.\n`);
  });
  exit(0);
}
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.substr(2).toLowerCase();
    const value = args[i + 1];
    if (!value || !value.startsWith('--')) {
      entries.set(key, value);
      i += 1;
    } else {
      entries.set(key, null);
    }
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const controller = new MIMH03Device({
  ip: entries.get('ip'),
  token: entries.get('token'),
});

async function run() {
  if (entries.has('requesttoken')) {
    stdout.write('Requesting device token (AP button may need to be pressed)...\n');
    const token = await controller.requestToken();
    stdout.write(`DeviceToken: ${token}\n`);
    controller.token = token;
    controller.buildRequester();
  }
  const { Devices } = await controller.getDevices();
  const defaultDevice = Devices[0];
  let requestedDevice;
  if (entries.has('id')) {
    requestedDevice = Devices.find((device) => device.id === entries.get('id'));
  } else if (entries.has('name')) {
    requestedDevice = Devices.find((device) => device.name === entries.get('name'));
  }
  const target = requestedDevice || defaultDevice;
  if (!target) {
    throw new Error('Device not found!');
  }

  if (entries.has('mode')) {
    if (!target.Mode) {
      throw new Error('Mode not supported!');
    }
    const mode = entries.get('mode');
    if (target.Mode.modes[0].toLowerCase() !== `opmode_${mode}`) {
      /** @type {any} */
      const newMode = `Opmode_${mode[0].toUpperCase()}${mode.substr(1)}`;
      stdout.write(`Changing mode: ${target.Mode.modes[0]} => ${newMode}\n`);
      await controller.setMode(target, newMode);
    }
  }
  if (entries.has('temp')) {
    if (!target.Temperatures?.[0]) {
      throw new Error('Mode not supported!');
    }
    const temp = parseInt(entries.get('temp'), 10);
    if (Number.isNaN(temp)) {
      throw new Error('Invalid temperature!');
    }
    if ('minimum' in target.Temperatures[0]) {
      if (temp < target.Temperatures[0].minimum) {
        throw new Error('Temperature out of range!');
      }
    }
    if ('maximum' in target.Temperatures[0]) {
      if (temp > target.Temperatures[0].maximum) {
        throw new Error('Temperature out of range!');
      }
    }
    if (target.Temperatures[0].desired !== temp) {
      stdout.write(`Changing mode: ${target.Temperatures[0].desired} => ${temp}\n`);
      await controller.setTemperature(target, temp);
    }
  }
  if (entries.has('speed')) {
    if (!target.Wind || 'speedLevel' in target.Wind === false) {
      throw new Error('Speed not supported!');
    }
    const speed = parseInt(entries.get('speed'), 10);
    if (Number.isNaN(speed)) {
      throw new Error('Invalid speed!');
    }
    if (target.Wind.speedLevel !== speed) {
      stdout.write(`Changing mode: ${target.Wind.speedLevel} => ${speed}\n`);
      await controller.setFanSpeed(target, speed);
    }
  }
  if (entries.has('direction')) {
    if (!target.Wind || 'direction' in target.Wind === false) {
      throw new Error('Direction not supported!');
    }
    /** @type {any} */
    const direction = entries.get('direction');
    if (direction != null && target.Wind.direction !== direction) {
      stdout.write(`Changing mode: ${target.Wind.direction} => ${direction}\n`);
      await controller.setFanDirection(target, direction);
    }
  }
  if (entries.has('info')) {
    const info = await controller.getDevices();
    const output = requestedDevice ? info.Devices.find((d) => d.id === target.id) : info;
    stdout.write(JSON.stringify(output, null, 2));
    stdout.write('\n');
  }
}

run().catch((err) => { throw err; });
