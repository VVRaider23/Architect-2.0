import { runAll } from '../src/lib/engine';
import { seedAnswerKey, LIVE_FLAG_CLAIMS } from '../src/lib/seed';
import { triage } from '../src/lib/engine';
import { generateFiles } from '../src/lib/codegen';
import { newProject } from '../src/lib/seed';
import { countDelta } from '../src/lib/diff';
const key = seedAnswerKey(Date.now());
for (const v of [1,2,3]) {
  const r = runAll(key, v);
  console.log(`v${v}: ${r.filter(x=>x.pass).length}/${r.length}`, r.filter(x=>!x.pass).map(x=>x.itemId).join(','));
}
for (const f of LIVE_FLAG_CLAIMS) console.log(f.claim.title, 'v2:', triage(f.claim,2).verdict.risk, 'v3:', triage(f.claim,3).verdict.risk);
const p = newProject('p1', 'claims assistant', Date.now());
p.answerKey = key;
const a = generateFiles(p, 1), b = generateFiles(p, 2);
console.log(Object.keys(a).length, 'files; risk_rules delta', countDelta(a['claims_agents/risk_rules.py'], b['claims_agents/risk_rules.py']));
