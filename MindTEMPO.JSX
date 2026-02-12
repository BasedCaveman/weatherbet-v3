import { useState, useCallback, useRef, useEffect } from "react";

const NODES = [
  // Center
  { id: "root", label: "WeatherBet\nUI Overhaul", x: 500, y: 400, type: "root", color: "#10b981" },

  // === BRANCH 1: DECISIONS MADE ===
  { id: "decisions", label: "Decisions\nMade ✅", x: 180, y: 180, type: "branch", color: "#22c55e" },
  { id: "parimutuel", label: "Parimutuel Pool\n(replaced Order Book)", x: 50, y: 60, type: "leaf", color: "#86efac", detail: "No counterparty needed. Users bet into YES/NO pools. Winners split losing side. Odds update on every bet. ~280 lines vs 400+ order book." },
  { id: "fee-model", label: "0.5% Fee\nOn Winnings Only", x: 200, y: 30, type: "leaf", color: "#86efac", detail: "Losers pay nothing extra. Revenue split: 50% platform, 25% climate fund, 25% market creator. No token needed." },
  { id: "reown", label: "Reown AppKit\n(Google/Apple login)", x: 350, y: 70, type: "leaf", color: "#86efac", detail: "OS-based sign-in eliminates wallet complexity. FREE unlimited users. Account abstraction + social login. PIX on-ramp via Coinbase." },
  { id: "megaeth", label: "MegaETH Testnet\n(Chain 6343)", x: 50, y: 170, type: "leaf", color: "#86efac", detail: "Timothy RPC. EVM compatible for easy Base migration. Sub-second block times. Code-compatible with mainnet launch." },
  { id: "invisible-web3", label: "Zero Web3\nTerminology", x: 220, y: 130, type: "leaf", color: "#86efac", detail: "No 'wallet', 'gas', 'transaction'. Consumer language: 'Get Started', 'Your Balance', 'Place Bet'. Blockchain completely invisible." },
  { id: "approval-cap", label: "10K USDm\nApproval Cap", x: 370, y: 160, type: "leaf", color: "#86efac", detail: "Safer than MaxUint256. Covers ~200 bets at $50. Power users can edit via wallet settings." },
  { id: "lat-lon", label: "Lat/Lon Stored\n(not hashed)", x: 80, y: 280, type: "leaf", color: "#86efac", detail: "Enables proximity sorting. Old contract hashed coordinates making them unreadable. New pool stores raw lat/lon." },

  // === BRANCH 2: CURRENCY & LOCALIZATION ===
  { id: "currency", label: "Currency &\nLocalization 🌍", x: 820, y: 160, type: "branch", color: "#3b82f6" },
  { id: "local-currency", label: "Local Currency\nDisplay", x: 900, y: 40, type: "leaf", color: "#93c5fd", detail: "All amounts shown in user's local currency (R$, MX$, £, ¥). Contract always works in USDm behind the scenes." },
  { id: "bet-presets", label: "Bet Presets in\nLocal Currency", x: 950, y: 120, type: "leaf", color: "#93c5fd", detail: "USDm presets: $1/$5/$10/$25/$50. Shown as R$5.17/R$25.85/R$51.70/R$129.25/R$258.50 in Brazil." },
  { id: "temp-units", label: "°C vs °F\nAuto-detect", x: 960, y: 200, type: "leaf", color: "#93c5fd", detail: "US users see Fahrenheit, rest of world sees Celsius. Based on detected locale/currency." },
  { id: "i18n", label: "PT / ES / FR / EN\nTranslations", x: 880, y: 280, type: "leaf", color: "#93c5fd", detail: "Portuguese (Brazil), Spanish (LatAm), French (Africa), English. Auto-detect from browser locale." },

  // === BRANCH 3: MARKET DISCOVERY ===
  { id: "discovery", label: "Market\nDiscovery 📍", x: 160, y: 550, type: "branch", color: "#f59e0b" },
  { id: "proximity", label: "Proximity\nSorting", x: 30, y: 450, type: "leaf", color: "#fcd34d", detail: "Closest market shown first via IP geolocation or mobile GPS. Others ordered by distance. Uses stored lat/lon from pool contract." },
  { id: "featured", label: "Featured Market\n(Full Card)", x: 50, y: 570, type: "leaf", color: "#fcd34d", detail: "Nearest market gets full expanded card with YES/NO buttons. All other markets shown as collapsed rows." },
  { id: "collapsed", label: "Collapsed Cards\nfor Others", x: 30, y: 680, type: "leaf", color: "#fcd34d", detail: "'🌧️ London — Rain — 55mm avg — 6d left'. Tap to expand. Prevents infinite scroll with 10+ markets." },
  { id: "regions", label: "Group by Region\n(Future)", x: 200, y: 700, type: "leaf", color: "#fcd34d", detail: "Americas / Europe / Asia / Africa / Oceania. Collapsible sections. Needed when market count exceeds ~15." },

  // === BRANCH 4: USER EXPERIENCE ===
  { id: "ux", label: "User\nExperience 🎯", x: 500, y: 700, type: "branch", color: "#ec4899" },
  { id: "portfolio", label: "Portfolio &\nPNL Page", x: 340, y: 780, type: "leaf", color: "#f9a8d4", detail: "Like Polymarket: all positions, entry price, current value, unrealized P&L. 'My Protections' tab." },
  { id: "smart-odds", label: "Smart Odds\nDisplay", x: 500, y: 810, type: "leaf", color: "#f9a8d4", detail: "Projected odds when one side empty (not 0%/0x). Shows what first bettor would earn. Encourages liquidity." },
  { id: "bottom-sheet", label: "Bottom Sheet\nAmount Picker", x: 660, y: 780, type: "leaf", color: "#f9a8d4", detail: "Mobile-native amount selection. Slides up from bottom. Large tap targets for outdoor/rural use." },
  { id: "visual-forecast", label: "Visual\nForecast Bars", x: 370, y: 680, type: "leaf", color: "#f9a8d4", detail: "Show rainfall/temperature forecast visually. Historical avg line + current prediction. Makes bet decision intuitive." },
  { id: "onboarding", label: "First-Time\nOnboarding", x: 620, y: 700, type: "leaf", color: "#f9a8d4", detail: "3-step welcome: detect location → show nearest market → explain YES/NO with visual example. Zero jargon." },

  // === BRANCH 5: INFRASTRUCTURE ===
  { id: "infra", label: "Infrastructure\n⚙️", x: 850, y: 550, type: "branch", color: "#8b5cf6" },
  { id: "chainlink", label: "Chainlink/API3\nWeather Oracle", x: 960, y: 420, type: "leaf", color: "#c4b5fd", detail: "Replace manual oracle with trustless weather feeds. Chainlink Data Streams or API3 for automated resolution." },
  { id: "yield", label: "Yield on\nPooled Funds", x: 980, y: 530, type: "leaf", color: "#c4b5fd", detail: "While funds wait for resolution, deposit into Aave/Compound. Interest feeds 50/25/25 revenue split." },
  { id: "base-migration", label: "Base → MegaETH\nMigration Path", x: 960, y: 640, type: "leaf", color: "#c4b5fd", detail: "Start on Base (proven EVM + Coinbase PIX). Migrate to MegaETH post-launch. Same Solidity, zero rewrite." },
  { id: "gas-sponsor", label: "Gas\nSponsorship", x: 850, y: 720, type: "leaf", color: "#c4b5fd", detail: "Batch transactions to reduce cost. Platform pays gas for users. Essential for R$1 micro-bets." },

  // === BRANCH 6: MARKET CREATION ===
  { id: "creation", label: "Market\nCreation 🏗️", x: 500, y: 180, type: "branch", color: "#ef4444" },
  { id: "user-markets", label: "User-Created\nMarkets", x: 550, y: 50, type: "leaf", color: "#fca5a5", detail: "Request-based: users submit location + type. Admin approves. Or: require 50 USDm deposit (returned on resolution). Creator earns 25% of fees." },
  { id: "market-deposit", label: "Creator Deposit\n(Anti-spam)", x: 680, y: 100, type: "leaf", color: "#fca5a5", detail: "50 USDm deposit required to create market. Returned + 25% fee bonus on resolution. Prevents spam." },
  { id: "multi-outcome", label: "Multi-Outcome\nMarkets (Future)", x: 650, y: 20, type: "leaf", color: "#fca5a5", detail: "Not just YES/NO. Ranges: 'Rain 0-50mm / 50-100mm / 100-150mm / 150mm+'. More nuanced predictions." },

  // === BRANCH 7: REVENUE & IMPACT ===
  { id: "revenue", label: "Revenue &\nImpact 💚", x: 820, y: 400, type: "branch", color: "#14b8a6" },
  { id: "climate-fund", label: "25% Climate\nImpact Fund", x: 950, y: 330, type: "leaf", color: "#5eead4", detail: "Automatic protocol-level funding. Anyone can trigger withdrawal. Supports agricultural community grants." },
  { id: "no-token", label: "No Token\nNeeded", x: 780, y: 310, type: "leaf", color: "#5eead4", detail: "Revenue from usage fees + yield. Not token speculation. Sustainable without pumping/dumping." },
  { id: "referrals", label: "Referral\nSystem", x: 700, y: 370, type: "leaf", color: "#5eead4", detail: "Share % of referred user's fee. Cooperative leaders can earn by onboarding their community." },

  // === BRANCH 8: DISTRIBUTION ===
  { id: "distribution", label: "Distribution\nChannels 📱", x: 180, y: 380, type: "branch", color: "#f97316" },
  { id: "whatsapp", label: "WhatsApp\nBot", x: 50, y: 350, type: "leaf", color: "#fdba74", detail: "Primary channel for farmers. Bot sends alerts, accepts bets, notifies payouts. Integrated with Twilio." },
  { id: "telegram", label: "Telegram\nMini App", x: 80, y: 460, type: "leaf", color: "#fdba74", detail: "Reown supports Telegram Mini Apps. No install required. Distribution through cooperative groups." },
  { id: "pwa", label: "PWA\n(Add to Home)", x: 200, y: 450, type: "leaf", color: "#fdba74", detail: "Progressive Web App. Works offline-first. Install on home screen like native app. Low bandwidth." },
  { id: "cooperatives", label: "Cooperative\nPartnerships", x: 260, y: 340, type: "leaf", color: "#fdba74", detail: "Trust via community leaders. Onboarding through existing agricultural cooperatives. Physical + digital." },
];

const EDGES = [
  // Root connections
  { from: "root", to: "decisions" }, { from: "root", to: "currency" },
  { from: "root", to: "discovery" }, { from: "root", to: "ux" },
  { from: "root", to: "infra" }, { from: "root", to: "creation" },
  { from: "root", to: "revenue" }, { from: "root", to: "distribution" },

  // Decisions
  { from: "decisions", to: "parimutuel" }, { from: "decisions", to: "fee-model" },
  { from: "decisions", to: "reown" }, { from: "decisions", to: "megaeth" },
  { from: "decisions", to: "invisible-web3" }, { from: "decisions", to: "approval-cap" },
  { from: "decisions", to: "lat-lon" },

  // Currency
  { from: "currency", to: "local-currency" }, { from: "currency", to: "bet-presets" },
  { from: "currency", to: "temp-units" }, { from: "currency", to: "i18n" },

  // Discovery
  { from: "discovery", to: "proximity" }, { from: "discovery", to: "featured" },
  { from: "discovery", to: "collapsed" }, { from: "discovery", to: "regions" },

  // UX
  { from: "ux", to: "portfolio" }, { from: "ux", to: "smart-odds" },
  { from: "ux", to: "bottom-sheet" }, { from: "ux", to: "visual-forecast" },
  { from: "ux", to: "onboarding" },

  // Infra
  { from: "infra", to: "chainlink" }, { from: "infra", to: "yield" },
  { from: "infra", to: "base-migration" }, { from: "infra", to: "gas-sponsor" },

  // Creation
  { from: "creation", to: "user-markets" }, { from: "creation", to: "market-deposit" },
  { from: "creation", to: "multi-outcome" },

  // Revenue
  { from: "revenue", to: "climate-fund" }, { from: "revenue", to: "no-token" },
  { from: "revenue", to: "referrals" },

  // Distribution
  { from: "distribution", to: "whatsapp" }, { from: "distribution", to: "telegram" },
  { from: "distribution", to: "pwa" }, { from: "distribution", to: "cooperatives" },
];

const STATUS_BADGES = {
  "decisions": "✅ Done",
  "currency": "🔧 In Progress",
  "discovery": "📋 UI Overhaul",
  "ux": "📋 UI Overhaul",
  "infra": "⏳ Post-MVP",
  "creation": "⏳ Post-MVP",
  "revenue": "✅ Built In",
  "distribution": "⏳ Post-MVP",
};

export default function WeatherBetMindMap() {
  const [selected, setSelected] = useState(null);
  const [hoveredBranch, setHoveredBranch] = useState(null);
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

  const scaleX = dimensions.w / 1000;
  const scaleY = dimensions.h / 850;

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

      {/* Title */}
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
          🌤️ WeatherBet — Mind Map
        </h1>
        <p style={{ color: "#6b7280", fontSize: 11, margin: "4px 0 0" }}>
          Click any node for details • Hover branches to focus
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, height: dimensions.h }}>
        {/* SVG Mind Map */}
        <svg
          ref={svgRef}
          viewBox={`0 0 1000 850`}
          width={selected ? dimensions.w * 0.65 : dimensions.w}
          height={dimensions.h}
          style={{ transition: "width 0.3s ease" }}
        >
          {/* Glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
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

            // Curved path
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

            return (
              <g
                key={node.id}
                style={{
                  cursor: isLeaf ? "pointer" : isBranch ? "pointer" : "default",
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
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={isActive ? node.color : `${node.color}22`}
                  stroke={node.color}
                  strokeWidth={isActive ? 3 : isRoot ? 2.5 : 1.5}
                  filter={isRoot || isActive ? "url(#glow)" : undefined}
                />

                {/* Label */}
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

                {/* Status badge for branches */}
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

              {/* Connection info */}
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
          gap: 20,
          paddingTop: 8,
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#22c55e", label: "✅ Decided" },
          { color: "#3b82f6", label: "🔧 In Progress" },
          { color: "#f59e0b", label: "📋 UI Overhaul" },
          { color: "#ec4899", label: "📋 UI Overhaul" },
          { color: "#8b5cf6", label: "⏳ Post-MVP" },
          { color: "#ef4444", label: "⏳ Post-MVP" },
          { color: "#14b8a6", label: "✅ Built In" },
          { color: "#f97316", label: "⏳ Post-MVP" },
        ].filter((v, i, a) => a.findIndex((x) => x.label === v.label) === i)
          .map((item, i) => (
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
