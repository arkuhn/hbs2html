#!/usr/bin/env node

const fs = require('fs');
const chokidar = require('chokidar');
const browserSync = require('browser-sync').create();
const Handlebars = require('handlebars');
const { program } = require('commander');
const path = require('path');
const os = require('os');

program
  .version('1.0.0')
  .requiredOption('-i, --input <path>', 'input HBS file or directory containing HBS and JSON files')
  .option('-d, --data <json>', 'JSON data as a string or path to a JSON file')
  .option('-p, --port <number>', 'port number for the server', 3000);

program.parse(process.argv);

const options = program.opts();
const tempDir = os.tmpdir();
const outputFile = path.join(tempDir, 'output.html');

function isJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function getJsonData(dataOption) {
  if (!dataOption) {
    return {};
  }
  if (isJsonString(dataOption)) {
    return JSON.parse(dataOption);
  }
  if (fs.existsSync(dataOption)) {
    return JSON.parse(fs.readFileSync(dataOption, 'utf-8'));
  }
  throw new Error('Invalid JSON data or file path');
}

function registerHelpers() {
  Handlebars.registerHelper('equals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });

  // TODO other helpers
}

async function promptForFiles(directory) {
  const { default: inquirer } = await import('inquirer');

  const files = fs.readdirSync(directory);
  const hbsFiles = files.filter(file => file.endsWith('.hbs'));
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  if (hbsFiles.length === 0) {
    throw new Error('No .hbs files found in the directory');
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'hbsFile',
      message: 'Select the HBS file:',
      choices: hbsFiles,
      when: hbsFiles.length > 1
    },
    {
      type: 'list',
      name: 'jsonFile',
      message: 'Select the JSON data file:',
      choices: jsonFiles,
      when: jsonFiles.length > 1
    }
  ]);

  return {
    hbsFile: path.join(directory, answers.hbsFile || hbsFiles[0]),
    jsonFile: jsonFiles.length > 0 ? path.join(directory, answers.jsonFile || jsonFiles[0]) : null
  };
}

function compileHbs(input, output, jsonData) {
  registerHelpers();
  const templateContent = fs.readFileSync(input, 'utf-8');
  const template = Handlebars.compile(templateContent);
  const data = getJsonData(jsonData);
  const html = template(data);
  fs.writeFileSync(output, html);
}

async function startWatching(hbsFile, output, jsonData) {
  chokidar.watch(hbsFile).on('change', () => {
    console.log(`${hbsFile} has changed, compiling...`);
    compileHbs(hbsFile, output, jsonData);
    console.log('HTML compiled successfully');
    browserSync.reload();
  });

  browserSync.init({
    server: {
      baseDir: path.dirname(output)
    },
    startPath: path.basename(output),
    files: [output],
    port: options.port
  });

  console.log(`BrowserSync is watching ${output} on port ${options.port}`);
}

async function main() {
  try {
    let hbsFile = options.input;
    let dataFile = options.data;

    if (fs.lstatSync(options.input).isDirectory()) {
      const files = await promptForFiles(options.input);
      hbsFile = files.hbsFile;
      dataFile = files.jsonFile || options.data;
    }

    compileHbs(hbsFile, outputFile, dataFile);
    startWatching(hbsFile, outputFile, dataFile);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();