import { useState } from "react";
import { Bitcoin } from "lucide-react";

interface CryptoIconProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Map common symbols to their CoinGecko IDs
const symbolToId: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  UNI: "uniswap",
  ATOM: "cosmos",
  XLM: "stellar",
  FIL: "filecoin",
  TRX: "tron",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  INJ: "injective-protocol",
  SUI: "sui",
  SEI: "sei-network",
  MNT: "mantle",
  STRK: "starknet",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  FLOKI: "floki",
  GALA: "gala",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  ENJ: "enjincoin",
  IMX: "immutable-x",
  RENDER: "render-token",
  FET: "fetch-ai",
  GRT: "the-graph",
  AAVE: "aave",
  MKR: "maker",
  CRV: "curve-dao-token",
  LDO: "lido-dao",
  TON: "the-open-network",
  NOT: "notcoin",
  ONDO: "ondo-finance",
  JUP: "jupiter-exchange-solana",
  W: "wormhole",
  PYTH: "pyth-network",
  TIA: "celestia",
  EIGEN: "eigenlayer",
  ENA: "ethena",
  WLD: "worldcoin-wld",
  TAO: "bittensor",
  KAS: "kaspa",
  STX: "blockstack",
  ORDI: "ordinals",
  RUNE: "thorchain",
  CAKE: "pancakeswap-token",
  FTM: "fantom",
  HBAR: "hedera-hashgraph",
  ICP: "internet-computer",
  THETA: "theta-token",
  VET: "vechain",
  ALGO: "algorand",
  EOS: "eos",
  XTZ: "tezos",
  FLOW: "flow",
  EGLD: "elrond-erd-2",
  CHZ: "chiliz",
  GMT: "stepn",
  APE: "apecoin",
  BLUR: "blur",
  GMX: "gmx",
  PENDLE: "pendle",
  PIXEL: "pixels",
  PORTAL: "portal-2",
  BEAM: "beam-2",
  RON: "ronin",
  ARKM: "arkham",
  DYDX: "dydx-chain",
  SUSHI: "sushi",
  RAY: "raydium",
  JTO: "jito-governance-token",
  DOGS: "dogs-2",
  HMSTR: "hamster-kombat",
  CATI: "catizen",
  MANTA: "manta-network",
  ALT: "altlayer",
  DYM: "dymension",
  ZRO: "layerzero",
  ETHFI: "ether-fi",
  LISTA: "lista-dao",
  AEVO: "aevo-exchange",
  OMNI: "omni-network",
  SAGA: "saga-2",
  TNSR: "tensor",
  MEW: "cat-in-a-dogs-world",
  BOME: "book-of-meme",
};

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
};

export function CryptoIcon({ symbol, size = "md", className = "" }: CryptoIconProps) {
  const [hasError, setHasError] = useState(false);
  
  const coinId = symbolToId[symbol.toUpperCase()];
  const sizeClass = sizeClasses[size];
  
  // Use CoinGecko CDN for logos
  const logoUrl = coinId 
    ? `https://assets.coingecko.com/coins/images/${getCoinGeckoImageId(coinId)}/small/${coinId}.png`
    : null;
  
  // Alternative: use CryptoLogos.cc CDN (more reliable)
  const cryptoLogosUrl = `https://cryptologos.cc/logos/${getCryptoLogosName(symbol)}-${symbol.toLowerCase()}-logo.png`;
  
  // Use a simpler approach with CoinCap API which is more reliable
  const coinCapUrl = `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;

  if (hasError || !symbol) {
    return (
      <div className={`${sizeClass} rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center ${className}`}>
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
          {symbol?.slice(0, 2) || "?"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={coinCapUrl}
      alt={`${symbol} logo`}
      className={`${sizeClass} rounded-full object-contain ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

// Helper function to get CoinGecko image ID (simplified mapping)
function getCoinGeckoImageId(coinId: string): string {
  const imageIds: Record<string, string> = {
    bitcoin: "1",
    ethereum: "279",
    binancecoin: "825",
    solana: "4128",
    ripple: "44",
    cardano: "975",
    dogecoin: "5",
    // Add more as needed
  };
  return imageIds[coinId] || "1";
}

// Helper function for CryptoLogos naming convention
function getCryptoLogosName(symbol: string): string {
  const names: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    BNB: "bnb",
    SOL: "solana",
    XRP: "xrp",
    ADA: "cardano",
    DOGE: "dogecoin",
  };
  return names[symbol.toUpperCase()] || symbol.toLowerCase();
}

export default CryptoIcon;
