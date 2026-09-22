/**
 * FASHN try-on (tryon-max, quality, 1k) for the Contrado running tees. Reads
 * film-my-run-merch/Merch-Images/Running Tees/pairs.json ({ "<Colour> - <layout>": { garment, models: [{ file, name }] } }),
 * puts each model photo (Merch-Images/Raw images/<file>) in that garment, and writes
 * Merch-Images/Running Tees/<Colour> - <layout>/<name>.png, the layout upload-vest-photos.mjs reads.
 * Each model may carry a `prompt` (Try-On Max takes text instructions, e.g. recolouring a cap
 * to match the shirt). Skips outputs that already exist, so a re-run only does what is missing.
 *
 *   node scripts/fashn-tryon.mjs            # everything missing
 *   node scripts/fashn-tryon.mjs --only "Black - shoulder stripe/01"   # one (substring of "<folder>/<name>")
 */
import 'dotenv/config';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const key = process.env.FASHN_API_KEY;
if (!key) throw new Error('FASHN_API_KEY missing from .env');
const root = '../film-my-run-merch/Merch-Images';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const pairs = JSON.parse(await readFile(`${root}/Running Tees/pairs.json`, 'utf8'));

async function dataUri(path, maxSide) {
  // HEIC via sips (sharp on this Mac has no HEIF); everything else straight through sharp, EXIF-rotated.
  let input = path;
  if (/\.heic$/i.test(path)) {
    input = `/tmp/fashn-${Date.now()}.jpg`;
    execFileSync('sips', ['-s', 'format', 'jpeg', path, '--out', input], { stdio: 'ignore' });
  }
  const buf = await sharp(input).rotate().resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function run(modelPath, garmentPath, prompt) {
  const body = {
    model_name: 'tryon-max',
    inputs: {
      model_image: await dataUri(modelPath, 2048),
      product_image: await dataUri(garmentPath, 2048),
      generation_mode: 'quality',
      resolution: '1k',
      output_format: 'png',
      ...(prompt ? { prompt } : {}),
    },
  };
  const r = await fetch('https://api.fashn.ai/v1/run', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const { id, error } = await r.json();
  if (!id) throw new Error(`run: ${error ?? r.status}`);
  for (;;) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = await (await fetch(`https://api.fashn.ai/v1/status/${id}`, { headers: { Authorization: `Bearer ${key}` } })).json();
    if (s.status === 'completed') return Buffer.from(await (await fetch(s.output[0])).arrayBuffer());
    if (s.status === 'failed') throw new Error(`failed: ${JSON.stringify(s.error)}`);
  }
}

let done = 0, spent = 0;
for (const [folder, { garment, models }] of Object.entries(pairs)) {
  for (const { file, name, prompt } of models) {
    if (only && !`${folder}/${name}`.includes(only)) continue;
    const out = `${root}/Running Tees/${folder}/${name}.png`;
    if (await access(out).then(() => true, () => false)) { done++; continue; }
    await mkdir(`${root}/Running Tees/${folder}`, { recursive: true });
    process.stdout.write(`${folder}/${name} ← ${file} … `);
    try {
      await writeFile(out, await run(`${root}/Raw images/${file}`, `${root}/Running Tees/${garment}`, prompt));
      spent++; done++;
      console.log('ok');
    } catch (e) {
      // A failed run is not charged; pick another photo for this slot in pairs.json.
      console.log(e.message);
    }
  }
}
console.log(`${done} in place, ${spent} generated this run`);
