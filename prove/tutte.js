// Tutte le prove: sintassi, calcoli, prova a tappeto, interfaccia (se c'e il browser di prova). Si lancia con: node prove/tutte.js
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const radice = path.join(__dirname, '..');
let esito = 0;
const passo = (nome, fn) => { process.stdout.write(nome + '... '); const r = fn(); console.log(r.ok ? 'ok' + (r.nota ? ' (' + r.nota + ')' : '') : 'FALLITO'); if (!r.ok) { esito = 1; if (r.testo) console.log(r.testo); } };
const esegui = (args, opz) => { const r = spawnSync(process.execPath, args, Object.assign({ cwd: radice, encoding: 'utf8' }, opz)); return { ok: r.status === 0, testo: (r.stdout || '') + (r.stderr || '') }; };

passo('sintassi dei file', () => {
  const file = fs.readdirSync(radice).filter(f => f.endsWith('.js')).concat(fs.readdirSync(path.join(radice, 'prove')).map(f => 'prove/' + f));
  for (const f of file) { const r = esegui(['--check', f]); if (!r.ok) return { ok: false, testo: f + '\n' + r.testo }; }
  return { ok: true, nota: file.length + ' file' };
});
passo('versione coerente', () => {
  const app = /VERSIONE: '([\d.]+)'/.exec(fs.readFileSync(path.join(radice, 'app.js'), 'utf8'));
  const sw = /hich-officina-([\d.]+)/.exec(fs.readFileSync(path.join(radice, 'sw.js'), 'utf8'));
  const log = /^## ([\d.]+)/m.exec(fs.readFileSync(path.join(radice, 'CHANGELOG.md'), 'utf8'));
  const pk = JSON.parse(fs.readFileSync(path.join(radice, 'package.json'), 'utf8')).version;
  const ok = app && sw && log && app[1] === sw[1] && app[1] === log[1] && app[1] === pk;
  return { ok, testo: 'app.js ' + (app && app[1]) + ', sw.js ' + (sw && sw[1]) + ', CHANGELOG.md ' + (log && log[1]) + ', package.json ' + pk };
});
passo('pagine del sito aggiornate', () => esegui(['tools/sito.js', '--controlla']));
passo('calcoli e programmi', () => esegui(['prove/prove.js']));
passo('prova a tappeto', () => esegui(['prove/tappeto.js']));
passo('sito nel browser', () => {
  try { require.resolve('playwright'); } catch (e) { return { ok: true, nota: 'saltata: manca il browser di prova' }; }
  return esegui(['prove/sito.js'], { timeout: 300000 });
});
passo('interfaccia', () => {
  try { require.resolve('playwright'); } catch (e) { return { ok: true, nota: 'saltata: manca il browser di prova' }; }
  return esegui(['prove/ui.js'], { timeout: 900000 });
});
console.log(esito ? '\nPROVE FALLITE' : '\nTUTTO VERDE');
process.exit(esito);
