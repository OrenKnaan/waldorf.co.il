// Prints the SQL that creates one admin user, with a freshly salted password
// hash. Nothing here touches the database.
//
//   node content-api/make-user.mjs "אורן כנען" you@example.com super_admin
//
// Then run what it prints:
//
//   npx wrangler d1 execute waldorf-content --remote --command "<the INSERT>"
//
// This exists so a credential never has to live in a migration. Migrations are
// committed, this repository is public, and a password hash in a public file is
// an offline cracking target that no amount of iterations makes safe forever.
//
// The password is generated here rather than accepted as an argument: an
// argument would land in shell history, and a human-chosen password is the
// thing the throttle in the Worker is compensating for.
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
// Bound, not destructured: getRandomValues throws ERR_INVALID_THIS when it is
// called detached from the Crypto object that owns it.
const getRandomValues = webcrypto.getRandomValues.bind(webcrypto);

// Must match PBKDF2_ITERATIONS in src/index.js. Workers' WebCrypto refuses
// anything above 100000, and a hash generated above it verifies locally and
// then throws in production.
const ITERATIONS = 100000;

const b64 = (buf) => Buffer.from(new Uint8Array(buf)).toString('base64');

async function hash(password) {
  const salt = getRandomValues(new Uint8Array(16));
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}

// Unambiguous alphabet: no O/0, l/1/I. ~95 bits over 18 characters.
function password(len = 18) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = getRandomValues(new Uint8Array(len * 2));
  let out = '';
  // Reject bytes past the last whole multiple of the alphabet, so no character
  // is likelier than any other.
  const limit = 256 - (256 % alphabet.length);
  for (const b of bytes) {
    if (b >= limit) continue;
    out += alphabet[b % alphabet.length];
    if (out.length === len) break;
  }
  return out;
}

const [name, email, role = 'editor'] = process.argv.slice(2);
if (!name || !email) {
  console.error('usage: node content-api/make-user.mjs "Full Name" email@example.com [super_admin|admin|editor]');
  process.exit(2);
}
if (!['super_admin', 'admin', 'editor'].includes(role)) {
  console.error(`unknown role "${role}": expected super_admin, admin or editor`);
  process.exit(2);
}

const pass = password();
const id = 'u-' + webcrypto.randomUUID().slice(0, 8);
// Single-quoted SQL literals: double any quote inside the values.
const q = (s) => String(s).replace(/'/g, "''");

console.log(`\nPassword for ${email} (shown once, store it in a password manager):\n\n    ${pass}\n`);
console.log('SQL:\n');
console.log(
  `INSERT INTO users (id,name,email,role,password_hash,active,created_at,updated_at) ` +
  `VALUES ('${q(id)}','${q(name)}','${q(email)}','${q(role)}','${q(await hash(pass))}',1,` +
  `strftime('%s','now'),strftime('%s','now'));\n`,
);
console.log('Run it with:\n');
console.log('    npx wrangler d1 execute waldorf-content --remote --command "<paste the INSERT>"\n');
