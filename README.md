<p align="center">
  <img src="./public/banner.png" alt="Vesto Hero Banner" width="100%">
</p>

---


# 🧭 Introduction
Vesto is a fully transparent blockchain-fintech framework that turns real-world reserve proofs, custodial attestations, SPV revenue routing, and cross-chain stablecoin bridging into a single composable product. Every screen, mutation, and memo hash is authored to be auditable in minutes rather than months. The platform automates the journey from a user request to a notarized proof while keeping the UX calm, responsive, and legible enough for regulators, auditors, and engineers to inspect the same source of truth. Built to prove that design, logic, and trust can share one syntax.



# 🎯 Purpose & Direction
- **The gap**: Traditional custodians publish static PDFs and asynchronous mail merges; on-chain teams leak intent across multiple dashboards. Vesto stitches those worlds together, ensuring that every reserve statement, bridge movement, and SPV disbursement is published with a deterministic fingerprint.
- **Vision**: Radical transparency where automation, decentralization, and regulatory clarity support each other. The north-star principle is that any party should be able to reconstruct system state from public artifacts without privileged access.
- **Why Stellar**: Deterministic transaction envelopes, native compliance primitives, human-readable operations, and a verifiable public ledger. Memo hashes and manage_data entries give us structured anchoring without deploying custom smart contracts.
- **Architectural values**: Clarity through typed modules (`src/lib/*`), resilience via redundant IPFS pinning and SWR caching, zero-mock design in production fetchers, and full-chain proofs that reconcile Horizon, IPFS, and UI state before showing green badges.



# 🧩 Core Idea & Conceptual Flow
1. Request capture: users submit bridge intents, custodian uploads, or SPV yield events through focused forms and upload drawers.
2. Validation: the backend normalizes payloads, validates formats (GA… vs 0x…), and serializes metadata into canonical DAG-CBOR blocks.
3. Attestation: transactions are server-signed using custodian keys, manage_data anchors (for example `vesto.attestation.cid`), and memo hashes derived from `sha256(CIDv1)`.
4. Proof synthesis: ingest jobs query Horizon, reconcile memo hashes with Lighthouse responses, and normalize everything into proof records.
5. Dashboard narration: React pages hydrate via SWR, mutate in real time through `refresh*` buses, and project state across drawers, cards, and analytics tiles.

```
[User Request]
     ↓
[Custodian Validation]
     ↓
[IPFS Upload → CID]
     ↓
[On-chain Memo.hash]
     ↓
[Dashboard Verification]
```

Each layer feeds the next: validation shapes exactly what is pushed to IPFS, the resulting CID is hashed into a Stellar memo, Horizon ingestion fetches the memo to verify the CID, and the dashboard only elevates records to `Verified` after both the chain and the gateway agree. The outcome is a loop where data provenance can be traced backward from any UI element.



# 🧠 System Architecture

### Frontend (Next.js + React)
The App Router under `app/` defines every user-facing surface. Route-specific components live beside their pages (for example `app/bridge/components/`), while shared primitives occupy `src/components/`. Pages boot with skeleton states fed by SWR hooks that target deterministic cache keys (`bridge:locks`, `proofs:list`, `dashboard:kpis`). Client components never mutate module-level state; instead they call orchestration helpers like `refreshProofsAll()` from `src/lib/swr/mutateBus.ts` to fan out revalidation requests. Drawers, list tables, and metric tiles use Tailwind utility classes but inherit global rhythm from `app/globals.css`.

### Backend (API routes, Horizon ingestion, Lighthouse upload)
Server actions and API routes under `app/api/**` run on the Node.js runtime to keep signing keys private. Bridge endpoints (`/api/bridge/*`) pin DAG-CBOR metadata to Lighthouse, compute `sha256(CIDv1)`, and embed the digest via memo hash. IPFS uploads rely on the documented client in `src/lib/ipfs`, which retries 0 → 5 → 15 → 30 seconds before surfacing Lighthouse errors as structured hints. Ingest workers living under `src/lib/bridge`, `src/lib/custodian`, and `src/lib/spv` poll Horizon using the Stellar SDK, include transactions to access memo data, and join results with stored metadata. Every ingest pass persists a normalized shape that the UI can consume without recomputation.

### Blockchain Layer (Stellar SDK operations)
`src/lib/stellar` wraps Stellar SDK primitives for transaction building and signature hygiene. Server-signed envelopes use `TransactionBuilder` with explicit fees, `setTimeout(30)`, and deterministic operation order. Custodian attestations set `manage_data` entries like `vesto.attestation.cid` and attach memo hashes that encode the metadata digest. Bridge operations rely on a dedicated signer (`BRIDGE_SECRET`) so that client bundles never contain raw keys. Ledger reconciliation leans on Horizon cursor streams and gracefully handles truncated histories by persisting the last seen paging token.

### Storage (IPFS, Lighthouse, local caching)
Files and JSON metadata are split: heavy artefacts upload as UnixFS via CIDv1, while structured data uses DAG-CBOR with canonical key ordering. `src/lib/ipfs/storage.ts` abstracts pinning so we can target Lighthouse primary and fall back to local caches. Proof storage in `src/lib/proofs/storage.ts` persists minimal records (`cid`, `metadataCid`, `status`) to support offline mode. When Lighthouse returns 5xx codes, records drop into `Recorded` state and the diagnostics panel increments `cidFetchErrors` for visibility.

### 🗺️ Architecture Diagram
_Diagram to be inserted here (system flow or component graph)_

<p align="center">
  <img src="./public/diagram.png" alt="System Architecture Diagram" width="90%">
</p>



# ⚙️ Technical Decisions & Engineering Philosophy
The stack is intentionally narrow: Next.js for routing and streaming, Tailwind for precise composition, SWR for cache orchestration, Stellar SDK for deterministic transactions, and Lighthouse for IPFS pinning with predictable SLAs. Each choice reinforces the thesis that a solo engineer can ship institutional-grade transparency when the system is reasoned about as a graph of proofs.

- **Server-signed operations**: Keeping signing logic on the server prevents `getServer()` inversion bugs and protects secrets while preserving memo integrity. Custodian uploads call a single helper that injects memo hashes, manage_data keys, and `TransactionBuilder` envelopes with the same metadata digest used for IPFS.
- **Deterministic metadata**: DAG-CBOR is used to avoid floating JSON ordering. The resulting CIDv1, hashed with SHA-256, becomes the memo hash persisted on Stellar. This keeps the IPFS pointer tamper-evident and enables auditors to recompute the digest independently.
- **Zero-mock philosophy**: Production data flows never rely on stub responses. Every SWR key resolves through Horizon or Lighthouse; development mode may wrap the same fetchers with caching but never swaps them for fake payloads.

```ts
const server = new Server(HORIZON_URL);
const tx = new TransactionBuilder(account, { fee, networkPassphrase })
  .addOperation(
    Operation.manageData({ name: "vesto.attestation.cid", value: cidBuffer }),
  )
  .addMemo(Memo.hash(cidSha256))
  .setTimeout(30)
  .build();
tx.sign(Keypair.fromSecret(SPV_SECRET));
await server.submitTransaction(tx);
```

Minimalism, immutability, and deterministic UI updates are the guiding principles: props flow downward, SWR stores cache snapshots, and every state transition is triggered by explicit mutations rather than implicit side effects.



# 🧬 Data Model & API Structure
The data model balances human readability with machine verifiability. Core entities are encoded as DAG-CBOR but exposed here as JSON for clarity.

```json
{
  "$schema": "https://vesto.system/schemas/token-request.json",
  "type": "object",
  "required": ["amount", "asset", "recipient"],
  "properties": {
    "amount": { "type": "string", "pattern": "^[0-9]+(\\.[0-9]{1,7})?$" },
    "asset": { "type": "string", "enum": ["XLM", "SUSD"] },
    "recipient": { "type": "string", "pattern": "^(0x[0-9a-fA-F]{40}|GA[A-Z2-7]{54})$" },
    "chain": { "type": "string", "enum": ["EVM"] },
    "memo": { "type": "string", "maxLength": 32 }
  }
}
```

```json
{
  "$schema": "https://vesto.system/schemas/attestation.json",
  "type": "object",
  "required": ["week", "reserveAmount", "timestamp", "signature", "publicKey"],
  "properties": {
    "week": { "type": "integer", "minimum": 0 },
    "reserveAmount": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "nonce": { "type": "string" },
    "ipfs": {
      "type": "object",
      "properties": {
        "hash": { "type": "string" },
        "gateway": { "type": "string", "format": "uri" }
      }
    },
    "signature": { "type": "string" },
    "publicKey": { "type": "string" },
    "memoHashHex": { "type": "string" }
  }
}
```

```json
{
  "$schema": "https://vesto.system/schemas/reserve-proof.json",
  "type": "object",
  "required": ["cid", "metadataCid", "status", "sha256", "ledger"],
  "properties": {
    "cid": { "type": "string" },
    "metadataCid": { "type": "string" },
    "status": { "type": "string", "enum": ["Verified", "Recorded", "Invalid"] },
    "sha256": { "type": "string" },
    "ledger": { "type": "integer" },
    "uploadedAt": { "type": "string", "format": "date-time" },
    "failures": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

```json
{
  "$schema": "https://vesto.system/schemas/payout.json",
  "type": "object",
  "required": ["id", "spvAccount", "amount", "assetCode", "distributionCid"],
  "properties": {
    "id": { "type": "string" },
    "spvAccount": { "type": "string" },
    "amount": { "type": "string" },
    "assetCode": { "type": "string" },
    "distributionCid": { "type": "string" },
    "memoHash": { "type": "string" },
    "status": { "type": "string", "enum": ["Pending", "Submitted", "Settled", "Errored"] }
  }
}
```

### Key API endpoints
- `POST /api/bridge/lock` → validates token requests, uploads `vesto.lock@1` metadata, returns `{ hash, cid, memoHashHex }`.
- `POST /api/bridge/mint` → links to prior lock proof via `evmLockProofCid`, persists `vesto.mint@1`.
- `POST /api/bridge/redeem` → anchors redeem metadata and records optional burn transaction reference.
- `POST /api/custodian/attest` → stores attestation artefacts, writes `vesto.attestation.cid`, and triggers `refreshProofsAll()`.
- `GET /api/proofs` → aggregates proof list combining stored uploads, attestations, bridge events, and reserve summaries.

Consistency guarantees: memo hashes are always computed from the canonical CID bytes, CID mappings remain referential through both `cid` and `metadataCid`, and every proof includes the ledger sequence that observed the matching transaction. IPFS metadata is double-pinned (primary Lighthouse, secondary local cache) to keep retrieval deterministic.



# 🎨 UI / UX Logic
The interface reads like a design system narrative. Drawers reveal a single responsibility each—bridge forms prefill accounts, custodian uploads walk through IPFS status, and SPV payout drawers expose ledger tracking. Cards mirror hierarchy: quick access cards summarize proofs, list tables reveal provenance, and diagnostics panels highlight network health.

The design language leans on Apple-style glassmorphism with subtle gradients, soft shadows, and compositional balance that keeps typography leading consistent across devices. Motion is minimal yet purposeful: micro-transitions rely on ease-in-out curves (cubic-bezier(0.4, 0, 0.2, 1)) so state changes feel organic. Color psychology follows muted slate backgrounds, emerald highlights for verified records, and amber cues for pending states. Accessibility is assured via WCAG AA contrast, escapable drawers, keyboard-focused form controls, and reduced-motion fallbacks.

UI logic never hides the data graph. SWR hooks hydrate lists, `mutateBus` blasts cache invalidations, and optimistic flows are avoided so that what users see is what auditors can verify. A representative hook:

```ts
import useSWR from "swr";
import { buildProofList } from "@/src/lib/proofs/selectors";
import { fetchProofSources } from "@/src/lib/proofs/storage";

export function useProofs() {
  return useSWR("proofs:list", async () => {
    const sources = await fetchProofSources();
    return buildProofList(
      sources.local,
      sources.attestations,
      sources.reserveProofs,
      sources.bridge.locks,
      sources.bridge.mints,
      sources.bridge.redeems,
    );
  }, {
    refreshInterval: 15_000,
    errorRetryInterval: 5_000,
    onSuccess: () => console.debug("proofs:list hydrated"),
  });
}
```

Every drawer shares the same structural grid, ensuring muscle memory carries across tasks. Status chips align with the proof taxonomy (Verified, Recorded, Invalid), and tooltips surface raw ledger references for power users.



# ⚡ Performance & Optimization
Performance is engineered across the stack:
- SWR cache keys stay granular to avoid cross-route invalidations, and `mutateBus` batches revalidation (`Promise.all`) for bridge, proofs, dashboard, and SPV clusters.
- IPFS fetchers implement exponential backoff (0 → 5 → 15 → 30 seconds) with HEAD probes before GET, preventing UI thrash during network hiccups.
- Next.js parallel routes defer non-critical widgets until primary content resolves, while React Server Components pre-hydrate metadata that does not require client JavaScript.
- Debounced inputs in bridge forms prevent redundant validation requests, and transaction creation batches operations when possible.

An optimization pattern driving the dashboard:

```ts
async function hydrateBridgePanels() {
  const [locks, mints, redeems] = await Promise.all([
    loadLocks({ cursor: nextCursor("bridge:locks") }),
    loadMints({ cursor: nextCursor("bridge:mints") }),
    loadRedeems({ cursor: nextCursor("bridge:redeems") }),
  ]);
  const merged = reconcileByMemoHash([locks, mints, redeems]);
  return merged.filter((record) => record.status !== "Invalid" || record.metadataError);
}
```

Lazy loading keeps large proofs lists paginated, image assets defer via native `loading="lazy"`, and custom hooks convert ISO dates to relative labels client-side to avoid bloating server payloads. Lighthouse responses are memoized in memory to prevent repeated digest verification during a single render cycle.



# 🧩 Edge Cases & Failure Handling
Vesto plans for failure as a first-class experience:
- **Recorded vs Verified**: when memo hash and CID disagree, or a gateway fails to respond, records land in `Recorded` state with actionable metadata hints (for example `metadata: head: 502`).
- **Attestation guardrails**: invalid signatures or mismatched custodial accounts surface descriptive errors before any transaction submission. Upload drawers reveal signature verification results inline.
- **Lighthouse 502 fallback**: exponential retries escalate from HEAD to GET, and if all fail we annotate diagnostics (`cidFetchErrors`) while keeping the CID accessible for later rehydration.
- **Bridge validation**: recipient formats are strongly typed; GA accounts require mnemonic trustlines, while 0x addresses must be checksummed. Amounts below the minimum threshold throw canonical validation errors.
- **Self-healing loop**: once a previously recorded metadata fetch succeeds, ingestion promotes the record to `Verified`, triggers `refreshProofsAll()` and `refreshDashboardAll()`, and waits 1.5 seconds before resolving to respect ledger finality.
- **SPV distribution edges**: mismatched manage_data entries or stale ledger sequences raise `Suspended` states, preventing payouts while keeping dashboards honest about what needs attention.



# 🧪 Development Workflow & Conventions
The repository is designed for a solo engineer to move quickly without losing reliability.
- Atomic commits follow Conventional Commit semantics (`feat:`, `fix:`, `chore:`) and bundle only one conceptual change.
- Debug logging is structured, timestamped, and kept within `src/lib/logging`, making it easy to toggle verbosity without editing business logic.
- Naming discipline keeps proof-related files prefixed with `proof*`, attestation helpers inside `src/lib/custodian`, and SPV modules under `src/lib/spv`. This makes the `@/` alias predictable for any import.
- Linting (`npm run lint`) and builds (`npm run build`) are mandatory after every change; both pipelines must be green before shipping.
- Manual verification complements automation: dashboard flows are inspected alongside StellarExpert ledger traces to ensure memo hashes align.

Directory snapshot:

```txt
app/
  bridge/
  custodian/
  proofs/
  spv/
src/
  components/
  lib/
    bridge/
    custodian/
    ipfs/
    proofs/
    spv/
    swr/
docs/
  Bridge_Stablecoin.md
  Custodian_Attestation.md
  IPFS_Metadata.md
  Proofs_Audit.md
```

Developer discipline extends to environment management: `.env.local` stores secrets, `NEXT_PUBLIC_*` exposes only the values required for the client, and Node.js 18.17+ ensures compatibility with Next 15 features.



# 🧠 Lessons & Reflections
- Separation of Freighter interactions from server-side Stellar SDK signing was the single biggest stability leap.
- Treating memo hashes as first-class identifiers made it trivial to correlate Horizon records, IPFS metadata, and UI entries.
- Investing in DAG-CBOR early avoided subtle hashing bugs that crop up when JSON serialization differs across runtimes.
- The `mutateBus` pattern proved that cache orchestration can stay human-readable without adopting heavyweight state managers.
- Building diagnostics around `verifiedCount`, `recordedCount`, `skippedCount`, and `cidFetchErrors` keeps operators calm during gateway turbulence.
- Bridging workflows improved once we standardized metadata schemas (`vesto.lock@1`, `vesto.mint@1`, `vesto.redeem@1`) and embedded proof lineage directly in the data.
- A calm, minimal UI helps stakeholders focus on ledger evidence rather than chase animations; clarity is the ultimate performance feature.



# 📦 Setup (for context)
Install dependencies and launch the development server:

```bash
npm install && npm run dev
```

This repository assumes Node.js 18.17 or newer and a populated `.env.local` with Stellar and Lighthouse credentials.



# 🧭 Closing Notes
Vesto is a demonstration that financial infrastructure can be elegant, verifiable, and human. From Bridge locks to custodian attestations, every mechanics decision aims to make truth observable rather than promised. This system exists to prove that transparency and automation can coexist beautifully.
