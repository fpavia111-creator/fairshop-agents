// Shared contract checks on this agent's own manifest, fixtures and eval cases.
// canaries: fictional shopper and staff names planted in the fixtures; none may reach a result.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { agentContract } from 'fairshop-core/testkit';
import { manifest } from '../src/index.js';

const cf = fileURLToPath(new URL('../fixtures/canaries.json', import.meta.url));
agentContract({ manifest, casesFile: fileURLToPath(new URL('../evals/cases.json', import.meta.url)), canaries: existsSync(cf) ? JSON.parse(readFileSync(cf, 'utf8')) : [] });
