import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COIN_NAMES: Record<string, string> = {
  // Top coins
  BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana",
  XRP: "XRP", ADA: "Cardano", DOGE: "Dogecoin", AVAX: "Avalanche",
  DOT: "Polkadot", MATIC: "Polygon", LINK: "Chainlink", SHIB: "Shiba Inu",
  LTC: "Litecoin", UNI: "Uniswap", ATOM: "Cosmos", XLM: "Stellar",
  FIL: "Filecoin", TRX: "TRON", NEAR: "NEAR Protocol", APT: "Aptos",

  // Layer 2 & New chains
  ARB: "Arbitrum", OP: "Optimism", INJ: "Injective", SUI: "Sui",
  SEI: "Sei", MNT: "Mantle", STRK: "Starknet", ZK: "ZKsync",
  BLAST: "Blast", TIA: "Celestia", MANTA: "Manta Network", METIS: "Metis",

  // Meme coins
  PEPE: "Pepe", WIF: "dogwifhat", BONK: "Bonk", FLOKI: "Floki",
  MEME: "Memecoin", TURBO: "Turbo", PEOPLE: "ConstitutionDAO",
  NEIRO: "Neiro", PNUT: "Peanut", ACT: "Act I", GOAT: "Goatseus Maximus",

  // Gaming & Metaverse
  GALA: "Gala", SAND: "The Sandbox", MANA: "Decentraland", AXS: "Axie Infinity",
  ENJ: "Enjin Coin", IMX: "Immutable", PIXEL: "Pixels", PORTAL: "Portal",
  PRIME: "Echelon Prime", BEAM: "Beam", RON: "Ronin", SUPER: "SuperVerse",

  // AI coins
  RENDER: "Render", FET: "Fetch.ai", AGIX: "SingularityNET", OCEAN: "Ocean Protocol",
  GRT: "The Graph", TAO: "Bittensor", WLD: "Worldcoin", ARKM: "Arkham",
  RNDR: "Render", AI: "Sleepless AI", NFP: "NFPrompt", CGPT: "ChainGPT",

  // DeFi
  AAVE: "Aave", COMP: "Compound", MKR: "Maker", SNX: "Synthetix",
  CRV: "Curve", LDO: "Lido DAO", RPL: "Rocket Pool", EIGEN: "EigenLayer",
  ENA: "Ethena", PENDLE: "Pendle", ONDO: "Ondo", JUP: "Jupiter",
  W: "Wormhole", DYDX: "dYdX", CAKE: "PancakeSwap", SUSHI: "SushiSwap",

  // Solana ecosystem
  JTO: "Jito", PYTH: "Pyth Network", RAY: "Raydium", ORCA: "Orca",
  MNDE: "Marinade", DRIFT: "Drift", TENSOR: "Tensor", KMNO: "Kamino",

  // TON ecosystem
  TON: "Toncoin", NOT: "Notcoin", DOGS: "DOGS", HMSTR: "Hamster Kombat",
  CATI: "Catizen",

  // Bitcoin ecosystem
  ORDI: "ORDI", SATS: "SATS", STX: "Stacks", RUNE: "THORChain",

  // Infrastructure
  HBAR: "Hedera", ICP: "Internet Computer", THETA: "Theta Network",
  KAVA: "Kava", ROSE: "Oasis Network", ZIL: "Zilliqa", QTUM: "Qtum",
  FTM: "Fantom", CKB: "Nervos Network", KAS: "Kaspa",

  // Other popular
  JASMY: "JasmyCoin", CHZ: "Chiliz", BAKE: "BakeryToken",
  HOT: "Holo", VET: "VeChain", ONE: "Harmony", ALGO: "Algorand",
  EOS: "EOS", XTZ: "Tezos", FLOW: "Flow", EGLD: "MultiversX",
  GMT: "STEPN", APE: "ApeCoin", BLUR: "Blur", MAGIC: "Magic",
  GMX: "GMX", SSV: "SSV Network", ALT: "AltLayer", DYM: "Dymension",
  ETHFI: "Ether.fi", REZ: "Renzo", ZRO: "LayerZero", IO: "io.net",
  LISTA: "Lista", AEVO: "Aevo", BB: "BounceBit", OMNI: "Omni Network",
  SAGA: "Saga", TNSR: "Tensor", MEW: "cat in a dogs world",
  BOME: "Book of Meme", SLERF: "Slerf", MYRO: "Myro",
};

// Minimal fallback mapping for coins that may not have USDT pairs (or are blocked) on Binance
const COINGECKO_IDS: Record<string, string> = {
  MNT: "mantle",
};

type CoingeckoPrice = {
  price: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
};

async function fetchCoingeckoPrice(symbolUpper: string): Promise<CoingeckoPrice | null> {
  const id = COINGECKO_IDS[symbolUpper];
  if (!id) return null;

  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}` +
      `&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true&include_24hr_vol=true`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const item = json?.[id];

    const price = typeof item?.usd === "number" ? item.usd : null;
    if (price === null) return null;

    return {
      price,
      priceChangePercent: typeof item?.usd_24h_change === "number" ? item.usd_24h_change : 0,
      high24h: typeof item?.usd_24h_high === "number" ? item.usd_24h_high : price,
      low24h: typeof item?.usd_24h_low === "number" ? item.usd_24h_low : price,
      volume24h: typeof item?.usd_24h_vol === "number" ? item.usd_24h_vol : 0,
    };
  } catch {
    return null;
  }
}

async function fetchCoingeckoHistory(
  symbolUpper: string,
  daysToFetch: number
): Promise<{ date: string; price: number }[] | null> {
  const id = COINGECKO_IDS[symbolUpper];
  if (!id) return null;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${daysToFetch}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const points = Array.isArray(json?.prices) ? (json.prices as any[]) : null;
    if (!points) return null;

    // Collapse to 1 point per day (last value in the day)
    const byDate = new Map<string, number>();
    for (const p of points) {
      const ts = Array.isArray(p) ? p[0] : null;
      const price = Array.isArray(p) ? p[1] : null;
      if (typeof ts !== "number" || typeof price !== "number") continue;
      const date = new Date(ts).toISOString().split("T")[0];
      byDate.set(date, price);
    }

    return Array.from(byDate.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return null;
  }
}

function mergeKnownCoins(coins: any[]) {
  const existing = new Set((coins || []).map((c: any) => c.symbol));
  const extras = Object.entries(COIN_NAMES)
    .filter(([symbol]) => !existing.has(symbol))
    .map(([symbol, name]) => ({
      symbol,
      name,
      volume24h: 0,
      source: "known",
    }));

  return [...(coins || []), ...extras];
}

// Cache for all coins list (refreshed every hour)
let allCoinsCache: { coins: any[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch exchange rate for a currency against USD
async function fetchExchangeRate(targetCurrency: string): Promise<number> {
  if (targetCurrency === 'USD') return 1;
  
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${targetCurrency}`);
    if (!response.ok) {
      console.log(`Failed to fetch exchange rate for ${targetCurrency}`);
      return 1;
    }
    const data = await response.json();
    return data.rates?.[targetCurrency] || 1;
  } catch (error) {
    console.error(`Error fetching exchange rate for ${targetCurrency}:`, error);
    return 1;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, action, days, search, targetCurrency = 'USD' } = await req.json();
    
    // Get exchange rate if not USD
    const exchangeRate = await fetchExchangeRate(targetCurrency);
    
    // Handle all coins list request
    if (action === "list") {
      console.log("Fetching all coins list from Binance...");
      
      // Check cache
      if (allCoinsCache && Date.now() - allCoinsCache.timestamp < CACHE_DURATION) {
        console.log("Returning cached coins list");

        // Ensure latest display names are applied even when list is cached
        let coins = (allCoinsCache.coins || []).map((coin: any) => ({
          ...coin,
          name: COIN_NAMES[coin.symbol] || coin.name || coin.symbol,
        }));

        // Ensure curated coins are always available (even if Binance list misses them)
        coins = mergeKnownCoins(coins);

        // Filter by search if provided
        if (search) {
          const searchLower = search.toLowerCase();
          coins = coins.filter((coin: any) =>
            coin.symbol.toLowerCase().includes(searchLower) ||
            coin.name.toLowerCase().includes(searchLower)
          );
        }

        return new Response(
          JSON.stringify({ coins }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Fetch exchange info from Binance
      const response = await fetch("https://api.binance.com/api/v3/exchangeInfo");
      
      if (!response.ok) {
        throw new Error("Failed to fetch exchange info from Binance");
      }
      
      const data = await response.json();
      
      // Extract unique base assets that trade against USDT
      const usdtPairs = data.symbols.filter((s: any) => 
        s.quoteAsset === "USDT" && s.status === "TRADING"
      );
      
      // Get 24hr ticker for all symbols to get volume for sorting
      const tickerResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const tickerData = await tickerResponse.json();
      
      const volumeMap: Record<string, number> = {};
      tickerData.forEach((t: any) => {
        if (t.symbol.endsWith("USDT")) {
          const baseAsset = t.symbol.replace("USDT", "");
          volumeMap[baseAsset] = parseFloat(t.quoteVolume) || 0;
        }
      });
      
      let coins = usdtPairs.map((pair: any) => ({
        symbol: pair.baseAsset,
        name: COIN_NAMES[pair.baseAsset] || pair.baseAsset,
        volume24h: volumeMap[pair.baseAsset] || 0,
      }))
      .sort((a: any, b: any) => b.volume24h - a.volume24h);

      // Ensure curated coins are always present (e.g. MNT/Mantle)
      coins = mergeKnownCoins(coins);
      
      // Update cache
      allCoinsCache = { coins, timestamp: Date.now() };
      
      console.log(`Found ${coins.length} trading pairs on Binance`);
      
      // Filter by search if provided
      let resultCoins = coins;
      if (search) {
        const searchLower = search.toLowerCase();
        resultCoins = coins.filter((coin: any) => 
          coin.symbol.toLowerCase().includes(searchLower) ||
          coin.name.toLowerCase().includes(searchLower)
        );
      }
      
      return new Response(
        JSON.stringify({ coins: resultCoins }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle historical data request
    if (action === "history") {
      const historyPromises = symbols.map(async (symbol: string) => {
        const symbolUpper = symbol.toUpperCase();

        try {
          // Binance klines endpoint - 1d interval
          const daysToFetch = days || 30;
          const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbolUpper}USDT&interval=1d&limit=${daysToFetch}`
          );

          if (!response.ok) {
            console.log(`Failed to fetch history for ${symbolUpper}`);

            const history = await fetchCoingeckoHistory(symbolUpper, daysToFetch);
            if (history) {
              return { 
                symbol: symbolUpper, 
                history: history.map(h => ({ ...h, price: h.price * exchangeRate }))
              };
            }

            return null;
          }

          const data = await response.json();

          // klines returns: [openTime, open, high, low, close, volume, closeTime, ...]
          const history = data.map((kline: any[]) => ({
            date: new Date(kline[0]).toISOString().split("T")[0],
            price: parseFloat(kline[4]) * exchangeRate, // close price converted
          }));

          return {
            symbol: symbolUpper,
            history,
          };
        } catch (error) {
          console.error(`Error fetching history for ${symbolUpper}:`, error);

          const history = await fetchCoingeckoHistory(symbolUpper, days || 30);
          if (history) {
            return { 
              symbol: symbolUpper, 
              history: history.map(h => ({ ...h, price: h.price * exchangeRate }))
            };
          }

          return null;
        }
      });

      const historyData = (await Promise.all(historyPromises)).filter(Boolean);

      return new Response(
        JSON.stringify({ history: historyData, currency: targetCurrency, exchangeRate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Default: fetch current prices
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "Symbols array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pricePromises = symbols.map(async (symbol: string) => {
      const symbolUpper = symbol.toUpperCase();

      try {
        const priceResponse = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbolUpper}USDT`
        );

        const changeResponse = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbolUpper}USDT`
        );

        if (!priceResponse.ok || !changeResponse.ok) {
          console.log(`Failed to fetch price for ${symbolUpper}`);

          const cg = await fetchCoingeckoPrice(symbolUpper);
          if (cg) return { symbol: symbolUpper, ...cg };

          return null;
        }

        const priceData = await priceResponse.json();
        const changeData = await changeResponse.json();

        const basePrice = parseFloat(priceData.price);
        return {
          symbol: symbolUpper,
          price: basePrice * exchangeRate,
          priceChangePercent: parseFloat(changeData.priceChangePercent),
          high24h: parseFloat(changeData.highPrice) * exchangeRate,
          low24h: parseFloat(changeData.lowPrice) * exchangeRate,
          volume24h: parseFloat(changeData.volume),
        };
      } catch (error) {
        console.error(`Error fetching ${symbolUpper}:`, error);

        const cg = await fetchCoingeckoPrice(symbolUpper);
        if (cg) {
          return {
            symbol: symbolUpper,
            price: cg.price * exchangeRate,
            priceChangePercent: cg.priceChangePercent,
            high24h: cg.high24h * exchangeRate,
            low24h: cg.low24h * exchangeRate,
            volume24h: cg.volume24h,
          };
        }

        return null;
      }
    });

    const prices = (await Promise.all(pricePromises)).filter(Boolean);

    return new Response(
      JSON.stringify({ prices, currency: targetCurrency, exchangeRate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Crypto prices error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
