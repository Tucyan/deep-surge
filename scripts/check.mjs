import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
function scan(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?(entry.name==='vendor'?[]:scan(join(dir,entry.name))):entry.name.endsWith('.js')?[join(dir,entry.name)]:[]);}
const files=scan('dist');for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}console.log(`Syntax passed: ${files.length} JavaScript modules`);
