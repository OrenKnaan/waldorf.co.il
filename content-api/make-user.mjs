// Prints the SQL that creates an admin user, or resets an existing one's
// password, with a freshly salted hash. Nothing here touches the database.
//
//   node content-api/make-user.mjs "אורן כנען" you@example.com super_admin
//   node content-api/make-user.mjs --reset you@example.com
//
// Then run what it prints:
//
//   npx wrangler d1 execute waldorf-content --remote --command "<the SQL>"
//
// The password is printed on your terminal and nowhere else. Do not paste it
// into an issue, a chat or a commit; the whole point of a reset is to stop
// doing that.
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

async function hashPassword(password) {
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

const argv = process.argv.slice(2);

// ---- reset: rotate the password on an account that already exists ----------
if (argv[0] === '--reset') {
  const target = argv[1];
  if (!target) {
    console.error('usage: node content-api/make-user.mjs --reset email@example.com');
    process.exit(2);
  }
  const pass = password();
  const h = await hashPassword(pass);
  const e = String(target).replace(/'/g, "''");
  console.log(`\nNew password for ${target} (shown once, store it in a password manager):\n\n    ${pass}\n`);
  console.log('SQL, both statements matter:\n');
  // Ending every existing session is half the reset. A leaked password may
  // already have been used, and a bearer token outlives the password that
  // minted it.
  console.log(
    `UPDATE users SET password_hash='${h}', updated_at=strftime('%s','now') WHERE email='${e}'; ` +
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email='${e}');\n`,
  );
  console.log('Run it with:\n');
  console.log('    npx wrangler d1 execute waldorf-content --remote --command "<paste the SQL>"\n');
  process.exit(0);
}

const [name, email, role = 'editor'] = argv;
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
  `VALUES ('${q(id)}','${q(name)}','${q(email)}','${q(role)}','${q(await hashPassword(pass))}',1,` +
  `strftime('%s','now'),strftime('%s','now'));\n`,
);
console.log('Run it with:\n');
console.log('    npx wrangler d1 execute waldorf-content --remote --command "<paste the INSERT>"\n');
