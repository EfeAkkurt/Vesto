## Agent Log

- 2025-10-21: Codex (GPT-5) addressing bridge CID alias + auto-fill tasks from todo before resuming UI verification.
- 2025-10-21: Codex (GPT-5) acknowledged bridge/todo mandate; reading docs and prepping full Bridge + SDK separation fixes before implementation.
- 2025-10-21: Codex (GPT-5) resuming Phase 4 sprint; reviewed docs/todo and starting SDK split + custodian/IPFS fixes per hackathon brief.
- 2025-10-21: Codex (GPT-5) taking over hackathon Phase 4 tasks; reviewing docs, syncing SPV distribution/reserve pipeline before dashboard/proofs wiring.

# Repository Guidelines

This document is the canonical instruction set for every engineer (human or agent) touching this repository. Review it fully before beginning work and refer back to it whenever making decisions about structure, tooling, or delivery workflow.

---

## 1. Project Structure & Module Organization
- Source of truth for routes is the App Router under `app/`. Each folder represents a route segment and exposes a `page.tsx`. Shared layout and metadata live in `layout.tsx`.
- Global Tailwind v4 styles are defined in `app/globals.css`. Avoid scattering globals; prefer component-scoped utility classes.
- Static assets reside in `public/`.
- Configuration roots you must keep in sync: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.
- Shared utilities and domain modules are colocated under `src/lib/`. Avoid flat helper directories; respect the existing namespace organisation (e.g., `src/lib/custodian`, `src/lib/stellar`).

### 1.1 Component Placement
- Route-specific components live alongside their route (`app/<route>/components/` when the fileset grows).
- Shared UI primitives belong in `src/components/`. Honour existing naming conventions and grouping.
- Never introduce a new top-level directory without buy-in from repository owners.

---

## 2. Coding Style & Naming Conventions
- Strict TypeScript everywhere – no implicit `any`, no `// @ts-ignore` unless justified in the diff.
- Indentation is 2 spaces; keep files UTF-8, ASCII by default.
- Filenames: `kebab-case` for files, `PascalCase` for component exports.
- Imports: prefer the `@/*` alias for root-relative paths.
- Styling: Tailwind utility classes inline with JSX. Global CSS should remain minimal and only for true globals.
- Write defensive, deterministic React code. Avoid mutable module-level state in client components.
- No mock/stub data in production paths; match the live Horizon/IPFS flows defined in `/docs`.

---

## 3. Build, Test, and Verification Workflow

### 3.1 Command Reference
- `npm run dev` — start the live dev server at `http://localhost:3000`.
- `npm run lint` — run ESLint (Next core-web-vitals + TypeScript rules).
- `npm run build` — produce the production bundle (`.next/`).
- `npm start` — serve the production build locally.

### 3.2 Zorunlu İşlem Sonrası Build Kuralı
**Her işlem (kod değişikliği, konfigürasyon güncellemesi, içerik düzenlemesi vb.) sonrasında `npm run build` çalıştırmak zorunludur.**
- Build çıktısında herhangi bir hata (error) tespit edilirse _hemen_ giderilmelidir. Hatalı build ile ilerlemek yasaktır.
- Build uyarıları (warning) da izlenir; kalıcı çözüme kavuşturulana kadar raporlanmalı veya düzeltme yapılmalıdır.
- Build çalıştırmadan commit, push veya görev kapatma yapılamaz.
- Otomasyon / ajanlar için: Bir adımın çıktısını değerlendirmeden sıradaki adıma geçmeyin; build başarısızsa önce düzeltin.

Önerilen doğrulama döngüsü:
```bash
npm run lint
npm run build
```

### 3.3 Test Stratejisi
- Henüz bir unit test harness’i yok. Test eklemek gerekiyorsa Vitest veya Jest + React Testing Library kullanın ve `__tests__/` altında route yapısına paralel dizin açın.
- En azından temel render ve kullanıcı etkileşimlerini manuel doğrulayın; dashboard ve custodian akışlarının Horizon/IPFS dokümantasyonu ile birebir çalıştığından emin olun.

---

## 4. Değişiklik Akışı (Operational Playbook)
1. **Hazırlık**
   - Çalışmaya başlamadan önce `/docs` altındaki tüm markdown dosyalarını yeniden okuyun. Horizon, IPFS ve Custodian talimatları buradaki gerçek kaynaktır.
   - `todo.md` içindeki önceliklendirilen işleri kontrol edin; dashboard genişletmeleri önceliklidir.
2. **Uygulama**
   - En küçük kapsamlı değişiklikle hedefe ulaşın. Gereksiz refactorlardan kaçının.
   - Kod yazarken TypeScript hatalarını anında çözün; `any` kullanımını gerekçelendirmeden eklemeyin.
3. **Doğrulama**
   - `npm run lint` → `npm run build`. Her adımdan sonra hataları giderin.
   - Build sonrası çıktıdaki boyut/performans regresyonlarına dikkat edin (Next.js raporları).
4. **Teslim**
   - Son mesajda sandbox kısıtlarını (örn. ağ erişimi, dev server) belirtin.
   - Yapılan değişikliklerin listesini ve varsa izlenecek sonraki adımları paylaşın.

---

## 5. Commit & PR Politikası
- Commit mesajları kısa ve emir kipinde; tercihen Conventional Commits (`feat:`, `fix:`, `chore:` vb.).
- PR açıklamaları kapsam, çözülen problem ve UI değişiklikleri için ekran görüntüsü içermeli.
- PR açmadan önce her zaman `npm run lint && npm run build`.
- Bağımlılık eklemeleri minimize edin; yeni paket gerekiyorsa PR açıklamasında gerekçelendirin.

---

## 6. Güvenlik & Konfigürasyon
- Node.js sürümü minimum 18.17 (Next 15 uyumluluğu).
- Sırlar `.env.local` içerisinde tutulur; istemciye `process.env` üzerinden kritik değer çıkarmayın.
- IPFS/Horizon erişimi sırasında kullanıcılara açık veri yollarını maskelemek gerekiyorsa `/docs` yönergelerine başvurun.

---

## 7. Agent-Specific Directives
- Dashboard görevleri diğer taleplerden önce tamamlanmalı (bkz. `todo.md`).
- Plan aracı sadece orta/uzun adımlı işlerde kullanılmalı; basit işler için plan yazmayın, tek adımlı plan oluşturmayın.
- Shell komutlarında her zaman `workdir` parametresi verin; arama için `rg` kullanımı tercih edin.
- Sandbox özellikleri (ör. ağ kısıtı, dev server erişimi) final notunda açıkça yazılmalı.
- Custodian ve dashboard akışlarında sahte veri bırakmayın; Horizon’dan canlı veri çekilemiyorsa, dökümanlarda tanımlı zarif geri dönüşleri uygulayın.
- Build/ lint sonuçlarını gizlemeyin; özellikle başarısız build çıkarsa sebebi ve çözümü rapor edin.
- Custodian attestation yüklemeleri yalnızca tek Freighter modalı ile `signTransaction` üzerinden yapılmalı; `manage_data` + `Memo.hash` yolunu ve `vesto.attestation.cid` adını koruyun.
- On-chain attestation başarılı olduktan sonra `refreshProofsAll()` ve `refreshDashboardAll()` çağrıları ile SWR mutasyonları tetikleyin ve 1.5 saniyelik ledger gecikmesi bekleyin.
- Proof doğrulama akışında `manage_data` işlemleri memo hash ile eşleşiyorsa `Verified` statüsüne çekin; IPFS 502/zaman aşımı durumlarını `Recorded` olarak işaretleyin ve diagnostik panellerde `{ verifiedCount, recordedCount, skippedCount, cidFetchErrors }` metriklerini gösterin.

---

Bu doküman, `/docs` içeriği ile çelişemez. Herhangi bir belirsizlikte `/docs` altındaki teknik rehberler son sözü söyler. Buradaki kuralların ihlali (özellikle zorunlu build kuralı) düzeltme yapılana kadar çalışmanın durdurulmasına neden olur.
