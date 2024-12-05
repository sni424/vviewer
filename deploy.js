// git pull
// read from "./deploy", then parse the first line as integer, then increment it by 1, then write it back to "./deploy"
// then git add, commit, push

import { execSync } from 'child_process';
import fs from 'fs';

execSync('git pull');
const deployFile = './deploy';
const deploy = fs.readFileSync(deployFile, 'utf8').trim();
const newDeploy = parseInt(deploy) + 1;
fs.writeFileSync(deployFile, newDeploy.toString());

execSync('git add .');
execSync(`git commit -m "deploy ${newDeploy}"`);
execSync('git push');

console.log(`deployed ${newDeploy}`);
