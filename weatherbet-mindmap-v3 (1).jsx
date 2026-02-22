import { useState, useCallback, useRef, useEffect } from "react";

const NODES = [
  // Center
  { id: "root", label: "WeatherBet\nv4 Status", x: 500, y: 400, type: "root", color: "#10b981" },

  // === BRANCH 1: DECISIONS MADE (expanded with test results) ===
  { id: "decisions", label: "Core\nDecisions ✅", x: 160, y: 180, type: "branch", color: "#22c55e" },
  { id: "parimutuel", label: "Parimutuel Pool\n✅ Tested", x: 40, y: 50, type: "leaf", color: "#86efac", detail: "FULLY TESTED on MegaETH testnet. 7 markets, $847 total pool. Math verified: payout accuracy to raw unit level. Winners split losing side proportionally. ~280 lines of Solidity." },
  { id: "fee-model", label: "0.5% Fee\n⚠️ Needs Fix", x: 200, y: 20, type: "leaf", color: "#fbbf24", detail: "DEPLOYED AS 60/30/10 (platform/climate/creator). INTENDED: 50/25/25 (platform/creator/climate). Constants are immutable — requires contract redeployment. Fee math itself verified correct." },
  { id: "reown", label: "Reown AppKit\n✅ Live", x: 360, y: 60, type: "leaf", color: "#86efac", detail: "OS-based sign-in (Apple/Google). FREE unlimited users. useDisconnect hook for proper sign out. On-ramp ready via Coinbase (PIX support for Brazil). Account view modal built in." },
  { id: "megaeth", label: "MegaETH Testnet\n✅ Deployed", x: 40, y: 170, type: "leaf", color: "#86efac", detail: "Chain 6343, Timothy RPC. 3 contracts deployed: MockUSDm (0x4605), WeatherBetPool (0x8114), MockWeatherOracle (0x79C0). All interactions tested via Remix + Blockscout." },
  { id: "oracle-tested", label: "Oracle Resolution\n✅ Verified", x: 220, y: 130, type: "leaf", color: "#86efac", detail: "MockWeatherOracle resolves markets correctly. historicalAvg vs actualValue comparison → YES/NO outcome. All 7 markets resolved via oracle (not admin). Production path validated." },
  { id: "claims-tested", label: "Claims & Edge\nCases ✅", x: 370, y: 150, type: "leaf", color: "#86efac", detail: "5 tests passed: winner payout exact, loser reverts (NothingToClaim), zero-profit returns full bet, double-claim reverts (AlreadyClaimed). One edge case found: stuck funds when winning pool=0." },
  { id: "invisible-web3", label: "Zero Web3\nTerminology", x: 100, y: 270, type: "leaf", color: "#86efac", detail: "No 'wallet', 'gas', 'transaction'. Consumer language: 'Get Started', 'Sign Out', 'Deposit'. Blockchain completely invisible to end users." },

  // === BRANCH 2: UI OVERHAUL (current sprint) ===
  { id: "ui", label: "UI\nOverhaul 🔧", x: 180, y: 520, type: "branch", color: "#3b82f6" },
  { id: "mobile-menu", label: "Mobile Account\nMenu ✅ Done", x: 30, y: 420, type: "leaf", color: "#86efac", detail: "Dropdown on address tap: Account (Reown modal), Copy Address, Sign Out. Green dot + chevron indicates tappable. Closes on outside click. Proper useDisconnect integration." },
  { id: "fund-button", label: "Fund Button\n✅ Done", x: 50, y: 540, type: "leaf", color: "#86efac", detail: "Environment-aware: NEXT_PUBLIC_NETWORK=mainnet → 'Deposit' (Reown on-ramp with PIX). Testnet → 'Get Test Tokens' (faucet). Translated in 5 languages." },
  { id: "i18n-updated", label: "i18n Updated\n✅ 5 Languages", x: 30, y: 650, type: "leaf", color: "#86efac", detail: "EN/PT/ES/FR/DE. New keys: header.account, header.copyAddress, header.signOut, fund.deposit, fund.getTestTokens, fund.claiming, fund.cooldown." },
  { id: "proximity", label: "Proximity\nSorting", x: 200, y: 660, type: "leaf", color: "#93c5fd", detail: "Closest market shown first via IP geolocation or mobile GPS. Uses stored lat/lon from pool contract. Featured card expanded, others collapsed." },
  { id: "bottom-sheet", label: "Bottom Sheet\nAmount Picker", x: 300, y: 580, type: "leaf", color: "#93c5fd", detail: "Mobile-native amount selection. Slides up from bottom. Large tap targets for outdoor/rural use. Bet presets in local currency." },
  { id: "visual-forecast", label: "Visual\nForecast Bars", x: 180, y: 430, type: "leaf", color: "#93c5fd", detail: "Show rainfall/temperature forecast visually. Historical avg line + current prediction. Makes bet decision intuitive without reading numbers." },

  // === BRANCH 3: CONTRACT v2 (next deployment) ===
  { id: "contract-v2", label: "Contract\nv2 🔴", x: 500, y: 160, type: "branch", color: "#ef4444" },
  { id: "fix-fees", label: "Fix Fee Split\n50/25/25", x: 420, y: 30, type: "leaf", color: "#fca5a5", detail: "CRITICAL: Redeploy with PLATFORM_SHARE=5000, CREATOR_SHARE=2500, CLIMATE_SHARE=2500. Current 60/30/10 is wrong. Constants immutable, must redeploy." },
  { id: "sweep-fn", label: "sweepUnclaimable\nDead Pool Fix", x: 580, y: 20, type: "leaf", color: "#fca5a5", detail: "When winning pool=0, losing side funds stuck forever (Tokyo $5 test case). Add admin sweepUnclaimable(). Route: 50% monthly winner incentive, 50% platform." },
  { id: "creator-param", label: "Creator Address\nParameter", x: 680, y: 80, type: "leaf", color: "#fca5a5", detail: "Currently all markets have Oracle as creator (gets 25% fee share stuck in contract). Fix: createMarket(address creator) so human requestor earns creator fees." },
  { id: "max-approval", label: "Approval Cap\n10K → Review", x: 560, y: 130, type: "leaf", color: "#fca5a5", detail: "Current: MaxUint256 approval. Consider capping at 10K USDm (~200 bets at $50). Safer for social login users who can't easily revoke approvals." },

  // === BRANCH 4: CURRENCY & LOCALIZATION ===
  { id: "currency", label: "Currency &\nLocalization 🌍", x: 840, y: 160, type: "branch", color: "#06b6d4" },
  { id: "local-currency", label: "Local Currency\n✅ Live", x: 920, y: 40, type: "leaf", color: "#86efac", detail: "All amounts in user's local currency (R$, MX$, £, ¥). Contract works in USDm. Auto-detect from timezone. 15+ currencies supported." },
  { id: "bet-presets", label: "Bet Presets\n✅ Live", x: 960, y: 120, type: "leaf", color: "#86efac", detail: "USDm presets: $1/$5/$10/$25/$50. Shown as R$5.17/R$25.85 etc. in Brazil. Currency conversion via useCurrency hook." },
  { id: "temp-units", label: "°C vs °F\nAuto-detect", x: 960, y: 200, type: "leaf", color: "#67e8f9", detail: "US users see Fahrenheit, rest sees Celsius. Based on detected currency. Not yet implemented — needs weather data integration first." },
  { id: "i18n", label: "5 Languages\n✅ Live", x: 880, y: 280, type: "leaf", color: "#86efac", detail: "PT/ES/FR/EN/DE. Auto-detect from browser. Manual switch in header. TranslationProvider context with getBrowserLanguage()." },

  // === BRANCH 5: TOKENOMICS (new!) ===
  { id: "tokenomics", label: "Tokenomics\n💎", x: 840, y: 400, type: "branch", color: "#a855f7" },
  { id: "token-explore", label: "Token Under\nExploration", x: 960, y: 330, type: "leaf", color: "#d8b4fe", detail: "Originally no-token planned. Now reconsidering inspired by Blackhaven TGE + MegaETH KPI-gated model. Token only launches after hitting ecosystem milestones." },
  { id: "yield-strategy", label: "USDm Yield\nStrategy", x: 980, y: 430, type: "leaf", color: "#d8b4fe", detail: "Idle pool capital (between creation and resolution) deposited into yield protocol. Yield = protocol revenue. Route to token stakers alongside 0.5% fees. Mirrors MegaETH's USDm→MEGA buyback." },
  { id: "flywheel", label: "Staker\nFlywheel", x: 960, y: 530, type: "leaf", color: "#d8b4fe", detail: "More bettors → more TVL → more yield → better staker returns → more token demand. Endowment fund stays, creators still earn, but yield layer gives stakers real utility." },
  { id: "climate-fund", label: "25% Climate\nEndowment", x: 850, y: 530, type: "leaf", color: "#d8b4fe", detail: "Protocol-level automatic funding. 25% of all fees go to climate impact fund. Supports agricultural community grants. Untouched by tokenomics changes." },

  // === BRANCH 6: MEGAETH INTEGRATION ===
  { id: "mega-integration", label: "MegaETH\nEcosystem ⚡", x: 820, y: 580, type: "branch", color: "#f97316" },
  { id: "chainlink-native", label: "Chainlink Native\nPrecompile", x: 950, y: 620, type: "leaf", color: "#fdba74", detail: "MegaETH has first native Chainlink Data Streams integration. Weather data → contract resolution with zero off-chain infra. Key pitch point to Bread/MegaETH team." },
  { id: "mega-domains", label: ".mega Domains\n(by Bread)", x: 960, y: 720, type: "leaf", color: "#fdba74", detail: "ERC-7828 cross-chain interop. bread.mega instead of 0x addresses. Built by Bread (0xBreadguy) our main MegaETH contact. Integration planned for frontend." },
  { id: "sub-10ms", label: "Sub-10ms\nTransactions", x: 840, y: 720, type: "leaf", color: "#fdba74", detail: "eth_sendRawTransactionSync <10ms. Mini-blocks break timestamp precision (security benefit). Critical for non-crypto users expecting instant UX." },
  { id: "pitch-ready", label: "Pitch Draft\n✅ Ready", x: 730, y: 670, type: "leaf", color: "#86efac", detail: "3 variants drafted for Bread: builder-first, punchy, and conversational. Highlights Chainlink native oracle + USDm yield + parametric insurance angle. Ready to send." },

  // === BRANCH 7: USER EXPERIENCE ===
  { id: "ux", label: "User\nExperience 🎯", x: 500, y: 700, type: "branch", color: "#ec4899" },
  { id: "portfolio", label: "Portfolio &\nPNL Page", x: 340, y: 780, type: "leaf", color: "#f9a8d4", detail: "All positions, entry price, current value, unrealized P&L. 'My Protections' tab. Like Polymarket but simpler." },
  { id: "smart-odds", label: "Smart Odds\nDisplay", x: 500, y: 810, type: "leaf", color: "#f9a8d4", detail: "Projected odds when one side empty. Shows what first bettor would earn. Prevents 0%/0x display confusion." },
  { id: "onboarding", label: "First-Time\nOnboarding", x: 660, y: 780, type: "leaf", color: "#f9a8d4", detail: "3-step welcome: detect location → show nearest market → explain YES/NO with visual example. Zero jargon." },

  // === BRANCH 8: DISTRIBUTION ===
  { id: "distribution", label: "Distribution\nChannels 📱", x: 180, y: 380, type: "branch", color: "#64748b" },
  { id: "whatsapp", label: "WhatsApp\nBot", x: 40, y: 340, type: "leaf", color: "#94a3b8", detail: "Primary channel for farmers. Social login via Google = same account. Bot sends alerts, shares web app links. Twilio integration." },
  { id: "telegram", label: "Telegram\nMini App", x: 80, y: 430, type: "leaf", color: "#94a3b8", detail: "Reown supports Telegram Mini Apps. No install required. Distribution through cooperative groups." },
  { id: "pwa", label: "PWA\n(Add to Home)", x: 250, y: 310, type: "leaf", color: "#94a3b8", detail: "Progressive Web App. Works offline-first. Install on home screen. Low bandwidth for rural connectivity." },
  { id: "cooperatives", label: "Cooperative\nPartnerships", x: 310, y: 400, type: "leaf", color: "#94a3b8", detail: "Trust via community leaders. Onboarding through existing agricultural cooperatives. Physical + digital. Inspiradoria consultancy for human-centered design." },
];

const EDGES = [
  // Root connections
  { from: "root", to: "decisions" }, { from: "root", to: "ui" },
  { from: "root", to: "contract-v2" }, { from: "root", to: "currency" },
  { from: "root", to: "tokenomics" }, { from: "root", to: "mega-integration" },
  { from: "root", to: "ux" }, { from: "root", to: "distribution" },

  // Decisions (tested)
  { from: "decisions", to: "parimutuel" }, { from: "decisions", to: "fee-model" },
  { from: "decisions", to: "reown" }, { from: "decisions", to: "megaeth" },
  { from: "decisions", to: "oracle-tested" }, { from: "decisions", to: "claims-tested" },
  { from: "decisions", to: "invisible-web3" },

  // UI Overhaul
  { from: "ui", to: "mobile-menu" }, { from: "ui", to: "fund-button" },
  { from: "ui", to: "i18n-updated" }, { from: "ui", to: "proximity" },
  { from: "ui", to: "bottom-sheet" }, { from: "ui", to: "visual-forecast" },

  // Contract v2
  { from: "contract-v2", to: "fix-fees" }, { from: "contract-v2", to: "sweep-fn" },
  { from: "contract-v2", to: "creator-param" }, { from: "contract-v2", to: "max-approval" },

  // Currency
  { from: "currency", to: "local-currency" }, { from: "currency", to: "bet-presets" },
  { from: "currency", to: "temp-units" }, { from: "currency", to: "i18n" },

  // Tokenomics
  { from: "tokenomics", to: "token-explore" }, { from: "tokenomics", to: "yield-strategy" },
  { from: "tokenomics", to: "flywheel" }, { from: "tokenomics", to: "climate-fund" },

  // MegaETH Integration
  { from: "mega-integration", to: "chainlink-native" }, { from: "mega-integration", to: "mega-domains" },
  { from: "mega-integration", to: "sub-10ms" }, { from: "mega-integration", to: "pitch-ready" },

  // UX
  { from: "ux", to: "portfolio" }, { from: "ux", to: "smart-odds" },
  { from: "ux", to: "onboarding" },

  // Distribution
  { from: "distribution", to: "whatsapp" }, { from: "distribution", to: "telegram" },
  { from: "distribution", to: "pwa" }, { from: "distribution", to: "cooperatives" },
];

const STATUS_BADGES = {
  "decisions": "✅ Tested",
  "ui": "🔧 Current Sprint",
  "contract-v2": "🔴 Next Deploy",
  "currency": "✅ Live",
  "tokenomics": "💎 Exploring",
  "mega-integration": "⚡ Pitch Ready",
  "ux": "📋 Planned",
  "distribution": "⏳ Post-MVP",
};

// Track completion for progress bar
const COMPLETION = {
  total: 39, // total leaf items
  done: 18,  // ✅ items
  inProgress: 7, // 🔧 items
  planned: 14, // remaining
};

export default function WeatherBetMindMap() {
  const [selected, setSelected] = useState(null);
  const [hoveredBranch, setHoveredBranch] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null); // null = show all
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 1000, h: 850 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        w: Math.min(window.innerWidth - 20, 1000),
        h: Math.min(window.innerHeight - 20, 850),
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const getNode = useCallback((id) => NODES.find((n) => n.id === id), []);

  const getParentBranch = useCallback((nodeId) => {
    const edge = EDGES.find((e) => e.to === nodeId);
    if (!edge) return null;
    const parent = getNode(edge.from);
    if (parent?.type === "branch") return parent.id;
    return null;
  }, [getNode]);

  const isHighlighted = useCallback((nodeId) => {
    if (!hoveredBranch) return true;
    if (nodeId === "root" || nodeId === hoveredBranch) return true;
    return getParentBranch(nodeId) === hoveredBranch;
  }, [hoveredBranch, getParentBranch]);

  const pct = Math.round((COMPLETION.done / COMPLETION.total) * 100);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1529 40%, #111827 100%)",
        minHeight: "100vh",
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        padding: "10px",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>
        <h1
          style={{
            color: "#10b981",
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.5px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          🌤️ WeatherBet — Project Map v3
        </h1>
        <p style={{ color: "#6b7280", fontSize: 11, margin: "4px 0 0" }}>
          Click nodes for details • Hover branches to focus • Feb 22, 2026
        </p>

        {/* Progress bar */}
        <div style={{ maxWidth: 360, margin: "8px auto 0", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "#1f2937", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981, #22c55e)",
                borderRadius: 3,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
            {COMPLETION.done}/{COMPLETION.total} ({pct}%)
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, height: dimensions.h }}>
        {/* SVG Mind Map */}
        <svg
          ref={svgRef}
          viewBox="0 0 1000 850"
          width={selected ? dimensions.w * 0.65 : dimensions.w}
          height={dimensions.h}
          style={{ transition: "width 0.3s ease" }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {EDGES.map((edge, i) => {
            const from = getNode(edge.from);
            const to = getNode(edge.to);
            if (!from || !to) return null;

            const branchId = from.type === "branch" ? from.id : getParentBranch(from.id) || from.id;
            const opacity = isHighlighted(to.id) ? 0.6 : 0.08;
            const branch = getNode(branchId);
            const color = branch?.color || "#374151";

            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const cx = mx + (from.y - to.y) * 0.15;
            const cy = my + (to.x - from.x) * 0.15;

            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={from.type === "root" ? 2.5 : 1.5}
                opacity={opacity}
                style={{ transition: "opacity 0.3s ease" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isRoot = node.type === "root";
            const isBranch = node.type === "branch";
            const isLeaf = node.type === "leaf";
            const isActive = selected === node.id;
            const highlighted = isHighlighted(node.id);

            const r = isRoot ? 52 : isBranch ? 40 : 32;
            const fontSize = isRoot ? 12 : isBranch ? 10 : 8.5;
            const opacity = highlighted ? 1 : 0.15;

            const lines = node.label.split("\n");
            const badge = STATUS_BADGES[node.id];

            // Color override for done items (green border pulse)
            const isDone = node.color === "#86efac";
            const isWarning = node.color === "#fbbf24";

            return (
              <g
                key={node.id}
                style={{
                  cursor: isLeaf || isBranch ? "pointer" : "default",
                  transition: "opacity 0.3s ease",
                  opacity,
                }}
                onClick={() => {
                  if (isLeaf) setSelected(selected === node.id ? null : node.id);
                }}
                onMouseEnter={() => {
                  if (isBranch) setHoveredBranch(node.id);
                }}
                onMouseLeave={() => {
                  if (isBranch) setHoveredBranch(null);
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={isActive ? node.color : `${node.color}22`}
                  stroke={node.color}
                  strokeWidth={isActive ? 3 : isRoot ? 2.5 : isDone ? 2 : isWarning ? 2 : 1.5}
                  strokeDasharray={isWarning ? "4 2" : "none"}
                  filter={isRoot || isActive ? "url(#glow)" : undefined}
                />

                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={node.x}
                    y={node.y + (li - (lines.length - 1) / 2) * (fontSize + 2)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? "#000" : "#e5e7eb"}
                    fontSize={fontSize}
                    fontWeight={isRoot || isBranch ? 700 : 500}
                    fontFamily="'DM Sans', sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {line}
                  </text>
                ))}

                {badge && (
                  <text
                    x={node.x}
                    y={node.y + r + 12}
                    textAnchor="middle"
                    fill={node.color}
                    fontSize={8}
                    fontWeight={500}
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ pointerEvents: "none" }}
                  >
                    {badge}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Detail Panel */}
        {selected && (() => {
          const node = getNode(selected);
          if (!node) return null;
          const parentEdge = EDGES.find((e) => e.to === selected);
          const parent = parentEdge ? getNode(parentEdge.from) : null;

          const isDone = node.color === "#86efac";
          const isWarning = node.color === "#fbbf24";
          const statusLabel = isDone ? "✅ COMPLETE" : isWarning ? "⚠️ NEEDS FIX" : "📋 TODO";

          return (
            <div
              style={{
                width: dimensions.w * 0.33,
                background: "rgba(17, 24, 39, 0.95)",
                border: `1px solid ${node.color}44`,
                borderRadius: 16,
                padding: 20,
                color: "#e5e7eb",
                overflowY: "auto",
                boxShadow: `0 0 30px ${node.color}22`,
                animation: "slideIn 0.3s ease",
              }}
            >
              <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                <div>
                  {parent && (
                    <span
                      style={{
                        fontSize: 10,
                        color: parent.color,
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      {parent.label.replace("\n", " ")}
                    </span>
                  )}
                  <h2
                    style={{
                      color: node.color,
                      fontSize: 18,
                      fontWeight: 700,
                      margin: "4px 0 0",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {node.label.replace("\n", " ")}
                  </h2>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      background: isDone ? "#22c55e22" : isWarning ? "#f59e0b22" : "#3b82f622",
                      color: isDone ? "#22c55e" : isWarning ? "#f59e0b" : "#60a5fa",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "#9ca3af",
                    fontSize: 18,
                    cursor: "pointer",
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: `${node.color}11`,
                  border: `1px solid ${node.color}33`,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#d1d5db",
                }}
              >
                {node.detail}
              </div>

              {/* Connections */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
                <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
                  CONNECTED TO
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {EDGES.filter((e) => e.from === selected || e.to === selected).map((e, i) => {
                    const otherId = e.from === selected ? e.to : e.from;
                    const other = getNode(otherId);
                    if (!other) return null;
                    return (
                      <button
                        key={i}
                        onClick={() => other.type === "leaf" ? setSelected(otherId) : null}
                        style={{
                          background: `${other.color}22`,
                          border: `1px solid ${other.color}44`,
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          color: other.color,
                          cursor: other.type === "leaf" ? "pointer" : "default",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {other.label.replace("\n", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          paddingTop: 8,
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#22c55e", label: "✅ Tested/Done" },
          { color: "#3b82f6", label: "🔧 Current Sprint" },
          { color: "#ef4444", label: "🔴 Next Deploy" },
          { color: "#a855f7", label: "💎 Exploring" },
          { color: "#f97316", label: "⚡ Pitch Ready" },
          { color: "#ec4899", label: "📋 Planned" },
          { color: "#64748b", label: "⏳ Post-MVP" },
        ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.color,
                }}
              />
              {item.label}
            </div>
          ))}
      </div>
    </div>
  );
}
