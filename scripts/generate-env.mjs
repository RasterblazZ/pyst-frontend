import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const googleClientId = process.env['GOOGLE_CLIENT_ID'];

if (!googleClientId) {
  throw new Error('Missing GOOGLE_CLIENT_ID in .env');
}

const outputPath = resolve('src/environments/environment.ts');
const contents = `export const environment = {
  googleClientId: '${googleClientId.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}',
};
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, contents);
