import fs from 'fs';
import path from 'path';

function run() {
  const appData = process.env.APPDATA;
  if (!appData) {
    console.log('No APPDATA env var');
    return;
  }
  const pgpassPath = path.join(appData, 'postgresql', 'pgpass.conf');
  console.log('Checking path:', pgpassPath);
  if (fs.existsSync(pgpassPath)) {
    console.log('pgpass.conf exists! Content:');
    console.log(fs.readFileSync(pgpassPath, 'utf8'));
  } else {
    console.log('pgpass.conf does not exist at that path.');
  }

  // Check user home for .pgpass
  const userHome = process.env.USERPROFILE || '';
  const dotPgpass = path.join(userHome, '.pgpass');
  console.log('Checking path:', dotPgpass);
  if (fs.existsSync(dotPgpass)) {
    console.log('.pgpass exists! Content:');
    console.log(fs.readFileSync(dotPgpass, 'utf8'));
  } else {
    console.log('.pgpass does not exist at that path.');
  }
}

run();
