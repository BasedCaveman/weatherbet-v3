import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying WeatherBet contracts to MegaETH...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy MockUSDm
  console.log("📝 Deploying MockUSDm...");
  const MockUSDm = await ethers.getContractFactory("MockUSDm");
  const usdm = await MockUSDm.deploy();
  await usdm.waitForDeployment();
  const usdmAddress = await usdm.getAddress();
  console.log("✅ MockUSDm deployed to:", usdmAddress);

  // 2. Deploy MockWeatherOracle
  console.log("\n📝 Deploying MockWeatherOracle...");
  const MockWeatherOracle = await ethers.getContractFactory("MockWeatherOracle");
  const oracle = await MockWeatherOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ MockWeatherOracle deployed to:", oracleAddress);

  // 3. Deploy WeatherOrderBook
  console.log("\n📝 Deploying WeatherOrderBook...");
  const WeatherOrderBook = await ethers.getContractFactory("WeatherOrderBook");
  const orderBook = await WeatherOrderBook.deploy(
    usdmAddress,
    oracleAddress,
    deployer.address // treasury = deployer for now
  );
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("✅ WeatherOrderBook deployed to:", orderBookAddress);

  // 4. Mint some test USDm to deployer
  console.log("\n💰 Minting test USDm...");
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDm
  await usdm.mint(deployer.address, mintAmount);
  console.log("✅ Minted 10,000 USDm to deployer");

  // 5. Create initial test markets
  console.log("\n📍 Creating test markets...");
  
  const testMarkets = [
    {
      cityName: "São Paulo",
      lat: -23550500,  // -23.5505 * 1e6
      lon: -46633300,  // -46.6333 * 1e6
      isRain: true,
      historicalAvg: 38,  // 38mm
      duration: 7
    },
    {
      cityName: "London",
      lat: 51507400,
      lon: -127800,
      isRain: true,
      historicalAvg: 15,  // 15mm
      duration: 7
    },
    {
      cityName: "Tokyo",
      lat: 35676200,
      lon: 139650300,
      isRain: false,
      historicalAvg: 154,  // 15.4°C * 10
      duration: 7
    }
  ];

  for (let i = 0; i < testMarkets.length; i++) {
    const market = testMarkets[i];
    const tx = await orderBook.createMarket(
      market.cityName,
      market.lat,
      market.lon,
      market.isRain,
      market.historicalAvg,
      market.duration
    );
    await tx.wait();
    console.log(`✅ Created market #${i + 1}: ${market.cityName} (${market.isRain ? 'Rain' : 'Temperature'})`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("MockUSDm:", usdmAddress);
  console.log("MockWeatherOracle:", oracleAddress);
  console.log("WeatherOrderBook:", orderBookAddress);
  console.log("Treasury:", deployer.address);
  console.log("=".repeat(60));
  
  console.log("\n💾 Save these addresses to your .env file:");
  console.log(`NEXT_PUBLIC_USDM_ADDRESS=${usdmAddress}`);
  console.log(`NEXT_PUBLIC_ORACLE_ADDRESS=${oracleAddress}`);
  console.log(`NEXT_PUBLIC_ORDER_BOOK_ADDRESS=${orderBookAddress}`);
  
  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
