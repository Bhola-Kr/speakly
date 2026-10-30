'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const cli = path.join(
  projectRoot,
  'node_modules',
  '@react-native-community',
  'cli',
  'build',
  'bin.js',
);
const output = process.argv[2];

if (!output) {
  throw new Error('An autolinking output path is required.');
}

const result = spawnSync(process.execPath, [cli, 'config'], {
  cwd: projectRoot,
  encoding: 'utf8',
});

if (result.status !== 0 || !result.stdout.trim()) {
  process.stderr.write(result.stderr || 'React Native CLI returned no config.');
  process.exit(result.status || 1);
}

JSON.parse(result.stdout);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, result.stdout, 'utf8');
