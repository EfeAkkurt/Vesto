Vesto / Dashboard için eksiksiz UI/UX planı burada. (Landing hazır; bu sayfa cüzdan bağlanınca “tek bakışta durum”u verir.)

Yapı & Düzen
	•	Layout
	•	Sol Sidebar (fixed 72–80px geniş, md: 260px): App logo, nav (Dashboard, Tokenize, Custodian, Proofs, Bridge), “Account” bölümü.
	•	Topbar (sticky): Arama (ileride), ağ göstergesi (Stellar PubNet/TestNet), Connect Wallet (durumlu), profil menüsü.
	•	Content Grid (max-w-[1280–1360px]): 12 kolon, 16px gutter.
	•	Satır 1: 4× KPI kart (3–4 sütun).
	•	Satır 2: 6 sütun Portfolio Breakdown (bar/stack) + 6 sütun Attestations (donut).
	•	Satır 3: 8 sütun Reserve & Payout Projection (area/line) + 4 sütun Network & Status.
	•	Satır 4: 8 sütun Recent Transactions (table) + 4 sütun Upcoming Payouts.

Bileşenler (UI)

1) KPI Cards (4 adet)
	•	Toplam Portföy ($) = RWA Token Value + Stablecoin Balance.
	•	Minted Tokens = aktif RWA token sayısı / tedarik.
	•	Reserve Coverage = (Reserve / Outstanding) %.
	•	Active Holders = benzersiz adres sayısı.
	•	Tasarımsal
	•	Card: rounded-2xl bg-card/60 border border-border/60 shadow-sm backdrop-blur
	•	İçerik: başlık text-sm text-muted-foreground, değer text-2xl/3xl font-semibold, delta badge (↑/↓).
	•	Etkileşim
	•	Hover: ring-1 ring-primary/25 translate-y-[-2px] (150ms).
	•	Tooltip: son güncelleme zamanı.
	•	Skeleton: animate-pulse h-8 w-24 bg-muted/40 rounded.

2) Portfolio Breakdown (Bar / Stack)
	•	Amaç: RWA (Invoice/Rent/Subscription) vs Stablecoin dağılımı (USD karşılığı).
	•	Grafik
	•	Recharts: BarChart (stacked), X: kategori, Y: USD.
	•	Renkler: primary (#ADD015) + chart-3/4 (temadaki oklch renkler).
	•	Grid çizgisi soft: stroke-border/30.
	•	Legend: üstte, küçük noktacıklar.
	•	Etkileşim
	•	Hover bar → tooltip: miktar, yüzde, son değişim.
	•	Click kategori → sağ panel filter (opsiyonel).
	•	Boş durum
	•	“Henüz RWA eklemediniz — Tokenize sayfasından başlayın.”

3) Attestations Donut
	•	Amaç: Haftalık Proof-of-Reserve özet; imzalı kanıtların oranı (onaylı/eksik/gecikmiş).
	•	Grafik
	•	Recharts: PieChart + Pie (innerRadius 60, outer 90), merkezde yüzde.
	•	Dilimler: onaylı (primary), bekleyen (muted), gecikmiş (destructive/amber).
	•	Liste
	•	Sağ yanında mini liste: “Week 41 – IPFS Qm… • Custodian sig: ✓”.
	•	Her satırda “Copy hash” ve “Open IPFS”.
	•	Animasyon
	•	Donut sweep 400ms; hover slice scale 1.03.

4) Reserve & Payout Projection (Area/Line)
	•	Amaç: Son 90 gün rezerv trendi + gelecek 30 gün payout tahmini.
	•	Grafik
	•	ComposedChart: Area (Reserve), Line (Projected Payout).
	•	X: tarih; Y: USD.
	•	Band highlight: gelecek alanı bg-primary/5.
	•	Etkileşim
	•	Brushing/zoom opsiyonel (ileri faz).
	•	Tooltip çoklu seri.
	•	Boş durum: “Rezerv beslemesi yok; Custodian attestation bekleniyor.”

5) Recent Transactions (Table)
	•	Kolonlar: Time, Type (Mint/Burn/Distribution/Attestation), Asset, Amount, Hash (kopya), Status.
	•	Satır etkileşimi: hover bg, hash kopyalama, hash’e tıkla → StellarExpert.
	•	Filtre: üstte type, date, status quick filters.
	•	Empty/Skeleton: 5 satır iskelet.

6) Upcoming Payouts (Card)
	•	Özet: “Next distribution: 120 USDC in 2 days” + “Distribute now” (role: SPV/custodian).
	•	Timeline: son 3 payout; IPFS linkleri.
	•	CTA: “View schedule”.

7) Network & Status (Card)
	•	Ağ rozeti: PubNet/TestNet; latency (ms), horizon health; wallet network mismatch uyarısı.
	•	Cüzdan: adres kısa gösterim, balance, “Switch Network” action.
	•	Güvenlik: son imza tarihi, izinler (signData/tx).

Navigasyon & Durumlar
	•	Sidebar
	•	Aktif menü highlight: bg-primary/10 text-primary.
	•	Küçük genişlikte icon-only; md’de label’lı.
	•	Topbar
	•	Connect Wallet state:
	•	Disconnected: ghost buton, tooltip “Freighter required”.
	•	Connecting: spinner + “Waiting for signature…”.
	•	Wrong Network: destructive badge “Switch to TestNet”.
	•	Connected: address chip + avatar.
	•	Ağ seçici: dropdown (TestNet / PubNet), badge renkleri.
	•	Global Toasts
	•	Success (distribution done), Warning (attestation missing), Error (tx reject).

Veri & API (mock → gerçek)
	•	Kaynaklar
	•	Horizon: hesap bakiyesi, işlemler, varlıklar.
	•	IPFS: attestation/audit pdf/json.
	•	Model (öneri)
    type Kpi = { portfolioUSD: number; minted: number; coverage: number; holders: number };
type Holding = { asset: string; type: "RWA"|"SUSD"; amount: number; usd: number };
type Attestation = { week: number; ipfs: string; signedBy: string; status: "ok"|"pending"|"late"; ts: string };
type Tx = { ts: string; type: "MINT"|"BURN"|"DIST"|"ATTEST"; asset: string; amount: number; hash: string; status: "success"|"pending"|"failed" };
type ReservePoint = { date: string; reserveUSD: number; payoutProjected: number };
	•	Boş/Loading/Fail states her widgetta tanımlı.

Animasyon Sistemi (hafif & tutarlı)
	•	Motion tokens
	•	Duration: fast 150ms, base 250ms, slow 400ms.
	•	Easing: easeOutCubic (0.33,1,0.68,1), hover: spring {stiffness:400, damping:30}.
	•	Giriş animasyonları
	•	KPI grid: parent stagger 0.06, child y:8, opacity 0→1.
	•	Charts: fade+scale 0.96→1 (250ms).
	•	Table rows: slight fade-in (60ms stagger).
	•	Reduced motion
	•	prefers-reduced-motion → animasyon kapalı.

Renk & Tema
	•	Temel tonlar: background (very dark violet), primary = #ADD015 (lime), text foreground açık gri.
	•	Kart bordürleri: border-[#1a1822], gradientli arka planlar opsiyonel (radial).
	•	Dikkat: lime fazla kullanımı göz yorar → KPI başlıkları ve vurgu ikonlarında kullan.

Erişilebilirlik
	•	Kontrast: en az 4.5:1; lime üzerine koyu yazı.
	•	Focus ring: ring-2 ring-primary/50 offset-2.
	•	Tooltips klavye erişilebilir (aria-describedby).
	•	Taborder: Topbar → Sidebar → Content; “Skip to content” link.

Performans
	•	next/image tüm görseller.
	•	Grafikleri lazy-load: viewport’a girince mount.
	•	react-query ile önbellek (5–15s stale).
	•	Sanal tablo 100+ satırda (ileride).

Güvenlik & Hata
	•	Wallet bağlantı hataları: modal + detay (Freighter not installed / denied).
	•	IPFS içerik yüklenemedi: retry + link kopyala.
	•	Horizon rate-limit → exponential backoff.

Boş Ekran Metinleri (kısa & yönlendirici)
	•	Dashboard boş: “Başlamak için Tokenize sayfasından ilk geliri ekleyin.”
	•	Attestations boş: “Custodian haftalık beyan yüklemedi. Proofs sekmesine gidin.”
	•	Transactions boş: “Henüz işlem yok, mint veya dağıtım yapın.”

Mini Component Kütüphanesi (isimler)
	•	KpiCard.tsx, DonutAttestations.tsx, PortfolioBars.tsx, ReserveProjection.tsx
	•	TransactionsTable.tsx, UpcomingPayoutCard.tsx, NetworkStatusCard.tsx
	•	CopyHash.tsx, AddressChip.tsx, BadgeDelta.tsx, Skeleton.tsx

Sıralı İnşa (FE)
	1.	Grid & iskelet (KPI + Charts çerçevesi).
	2.	KPI’lar (mock data).
	3.	Donut + Bars (Recharts).
	4.	Reserve line/area.
	5.	Table + copy hash.
	6.	Upcoming Payout + Network card.
	7.	Animasyon & skeleton & empty states.
	8.	Wallet/network state wiring.

    src/
├─ app/
│   ├─ dashboard/page.tsx
│   ├─ layout.tsx
│   └─ globals.css
├─ components/
│   ├─ layout/
│   │   ├─ Sidebar.tsx
│   │   ├─ Topbar.tsx
│   │   └─ LayoutShell.tsx
│   ├─ cards/
│   │   ├─ KpiCard.tsx
│   │   ├─ UpcomingPayoutCard.tsx
│   │   └─ NetworkStatusCard.tsx
│   ├─ charts/
│   │   ├─ PortfolioBars.tsx
│   │   ├─ DonutAttestations.tsx
│   │   ├─ ReserveProjection.tsx
│   │   └─ ChartWrapper.tsx
│   ├─ tables/
│   │   └─ TransactionsTable.tsx
│   ├─ ui/
│   │   ├─ CopyHash.tsx
│   │   ├─ AddressChip.tsx
│   │   ├─ BadgeDelta.tsx
│   │   ├─ Skeleton.tsx
│   │   └─ Tooltip.tsx
│   └─ motion/
│       └─ presets.ts
└─ lib/
├─ mockData.ts
├─ hooks/
│   └─ useWallet.ts
└─ utils/
├─ format.ts
└─ constants.ts