# samsungrac

NodeJS library for controlling Samsung RAC devices.

## Usage (CLI)

````
node cli [OPTION]...
````

See [cli/index.js](cli/index.js) for options.

## Usage (NodeJS) 

````js
import MIMH03Device from '@shortfuse/samsungrac/mim-h03.js';

async function getToken(ip) {
  const controller = new MIMH03Device({ ip });
  const token = await controller.requestToken();
  console.log('Token:', token);
  return token;
}

async function updateDevice(ip, token) {
  const controller = new MIMH03Device({ ip, token });
  const { Devices } = await controller.getDevices();
  const target = Devices[0];
  await controller.setMode(target, 'Opmode_Cool');
  await controller.setTemperature(target, 70);
  await controller.setFanSpeed(target, 0);
  await controller.setFanDirection(target, 'Fix');
});
````
