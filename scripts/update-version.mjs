const PREV_VERSION = require('core-js/package').version;
const NEW_VERSION = require('../package').version;

const { readdir, readJson, readFile, writeJson, writeFile } = fs;
const { green, red } = chalk;
const now = new Date();
const NEW_VERSION_MINOR = NEW_VERSION.replace(/^(\d+\.\d+)\..*/, '$1');
const PREV_VERSION_MINOR = PREV_VERSION.replace(/^(\d+\.\d+)\..*/, '$1');
const CHANGELOG = 'CHANGELOG.md';
const LICENSE = 'LICENSE';
const README = 'README.md';
const README_COMPAT = 'packages/core-js-compat/README.md';
const README_DENO = 'deno/corejs/README.md';
const SHARED = 'packages/core-js/internals/shared.js';
const BUILDER_CONFIG = 'packages/core-js-builder/config.js';
const CURRENT_YEAR = now.getFullYear();

const license = await readFile(LICENSE, 'utf8');
const OLD_YEAR = +license.match(/2014-(\d{4}) D/)[1];
await writeFile(LICENSE, license.replaceAll(OLD_YEAR, CURRENT_YEAR));

const readme = await readFile(README, 'utf8');
await writeFile(README, readme.replaceAll(PREV_VERSION, NEW_VERSION).replaceAll(PREV_VERSION_MINOR, NEW_VERSION_MINOR));

const readmeCompat = await readFile(README_COMPAT, 'utf8');
await writeFile(README_COMPAT, readmeCompat.replaceAll(PREV_VERSION_MINOR, NEW_VERSION_MINOR));

const readmeDeno = await readFile(README_DENO, 'utf8');
await writeFile(README_DENO, readmeDeno.replaceAll(PREV_VERSION, NEW_VERSION));

const shared = await readFile(SHARED, 'utf8');
await writeFile(SHARED, shared.replaceAll(PREV_VERSION, NEW_VERSION).replaceAll(OLD_YEAR, CURRENT_YEAR));

const builderConfig = await readFile(BUILDER_CONFIG, 'utf8');
await writeFile(BUILDER_CONFIG, builderConfig.replaceAll(OLD_YEAR, CURRENT_YEAR));

const packages = await readdir('packages');
for (const PATH of await glob('packages/*/package.json')) {
  const pkg = await readJson(PATH, 'utf8');
  pkg.version = NEW_VERSION;
  for (const field of ['dependencies', 'devDependencies']) {
    if (pkg[field]) for (const dependency of packages) {
      if (pkg[field][dependency]) pkg[field][dependency] = NEW_VERSION;
    }
  }
  await writeJson(PATH, pkg, { spaces: '  ' });
}

if (NEW_VERSION !== PREV_VERSION) {
  const changelog = await readFile(CHANGELOG, 'utf8');
  await writeFile(CHANGELOG, changelog.replaceAll('##### Unreleased', `##### Unreleased\n- Nothing\n\n##### [${
    NEW_VERSION
  } - ${
    CURRENT_YEAR }.${ String(now.getMonth() + 1).padStart(2, '0') }.${ String(now.getDate()).padStart(2, '0')
  }](https://github.com/zloirock/core-js/releases/tag/v${
    NEW_VERSION
  })`));
}

if (CURRENT_YEAR !== OLD_YEAR) echo(green('the year updated'));
if (NEW_VERSION !== PREV_VERSION) echo(green('the version updated'));
else if (CURRENT_YEAR === OLD_YEAR) echo(red('bump is not required'));

process.env.FORCE_COLOR = '1';

await $`npm run bundle-package deno`;
await $`run-s build-compat copy-compat-table`;
