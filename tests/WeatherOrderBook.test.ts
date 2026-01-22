import { expect } from "chai";
import { ethers } from "hardhat";
import { WeatherOrderBook, MockUSDm, MockWeatherOracle } from "../contracts/typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("WeatherOrderBook", function () {
  let orderBook: WeatherOrderBook;
  let usdm: MockUSDm;
  let oracle: MockWeatherOracle;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const PRECISION = 1000000n; // 1e6
  const MARKET_DURATION = 7; // 7 days

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy contracts
    const MockUSDm = await ethers.getContractFactory("MockUSDm");
    usdm = await MockUSDm.deploy();

    const MockWeatherOracle = await ethers.getContractFactory("MockWeatherOracle");
    oracle = await MockWeatherOracle.deploy();

    const WeatherOrderBook = await ethers.getContractFactory("WeatherOrderBook");
    orderBook = await WeatherOrderBook.deploy(
      await usdm.getAddress(),
      await oracle.getAddress(),
      deployer.address
    );

    // Mint USDm to users
    await usdm.mint(user1.address, 10000n * PRECISION); // 10,000 USDm
    await usdm.mint(user2.address, 10000n * PRECISION);

    // Approve order book
    await usdm.connect(user1).approve(await orderBook.getAddress(), ethers.MaxUint256);
    await usdm.connect(user2).approve(await orderBook.getAddress(), ethers.MaxUint256);
  });

  describe("Market Creation", function () {
    it("Should create a market", async function () {
      const tx = await orderBook.createMarket(
        "São Paulo",
        -23550500,  // lat
        -46633300,  // lon
        true,       // isRain
        38,         // historicalAvg
        MARKET_DURATION
      );

      await expect(tx)
        .to.emit(orderBook, "MarketCreated")
        .withArgs(1, "São Paulo", true, await ethers.provider.getBlock("latest").then(b => b!.timestamp + MARKET_DURATION * 86400));

      const market = await orderBook.getMarket(1);
      expect(market.cityName).to.equal("São Paulo");
      expect(market.isRainMarket).to.equal(true);
      expect(market.historicalAvg).to.equal(38);
    });

    it("Should only allow oracle or treasury to create markets", async function () {
      await expect(
        orderBook.connect(user1).createMarket("Tokyo", 35676200, 139650300, false, 154, MARKET_DURATION)
      ).to.be.revertedWithCustomError(orderBook, "Unauthorized");
    });
  });

  describe("Order Placement", function () {
    beforeEach(async function () {
      // Create a market
      await orderBook.createMarket("São Paulo", -23550500, -46633300, true, 38, MARKET_DURATION);
      
      // Deposit USDm
      await orderBook.connect(user1).deposit(1000n * PRECISION);
      await orderBook.connect(user2).deposit(1000n * PRECISION);
    });

    it("Should place a YES order", async function () {
      const price = 600000n; // 0.60 USDm
      const shares = 100n;

      const tx = await orderBook.connect(user1).placeOrder(1, true, price, shares);

      await expect(tx)
        .to.emit(orderBook, "OrderPlaced")
        .withArgs(1, 1, user1.address, true, price, shares);

      const order = await orderBook.getOrder(1);
      expect(order.user).to.equal(user1.address);
      expect(order.isYes).to.equal(true);
      expect(order.price).to.equal(price);
      expect(order.shares).to.equal(shares);
    });

    it("Should reject invalid prices", async function () {
      await expect(
        orderBook.connect(user1).placeOrder(1, true, PRECISION, 100) // Price = 1.00
      ).to.be.revertedWithCustomError(orderBook, "InvalidPrice");

      await expect(
        orderBook.connect(user1).placeOrder(1, true, 5000, 100) // Price < 0.01
      ).to.be.revertedWithCustomError(orderBook, "InvalidPrice");
    });

    it("Should match complementary orders", async function () {
      // User1 wants to buy YES at 0.60
      await orderBook.connect(user1).placeOrder(1, true, 600000n, 100n);

      // User2 wants to buy NO at 0.40 (opposite of 0.60)
      const tx = await orderBook.connect(user2).placeOrder(1, false, 400000n, 100n);

      // Should emit OrderMatched event
      await expect(tx).to.emit(orderBook, "OrderMatched");

      // Check positions
      const [user1Yes, user1No] = await orderBook.getPosition(1, user1.address);
      const [user2Yes, user2No] = await orderBook.getPosition(1, user2.address);

      expect(user1Yes).to.equal(100n);
      expect(user2No).to.equal(100n);
    });
  });

  describe("Order Cancellation", function () {
    beforeEach(async function () {
      await orderBook.createMarket("São Paulo", -23550500, -46633300, true, 38, MARKET_DURATION);
      await orderBook.connect(user1).deposit(1000n * PRECISION);
    });

    it("Should cancel an unfilled order", async function () {
      await orderBook.connect(user1).placeOrder(1, true, 600000n, 100n);

      const balanceBefore = await orderBook.balances(user1.address);
      
      const tx = await orderBook.connect(user1).cancelOrder(1);
      await expect(tx).to.emit(orderBook, "OrderCancelled");

      const balanceAfter = await orderBook.balances(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);

      const order = await orderBook.getOrder(1);
      expect(order.cancelled).to.equal(true);
    });

    it("Should not allow cancelling someone else's order", async function () {
      await orderBook.connect(user1).placeOrder(1, true, 600000n, 100n);

      await expect(
        orderBook.connect(user2).cancelOrder(1)
      ).to.be.revertedWithCustomError(orderBook, "Unauthorized");
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      await orderBook.createMarket("São Paulo", -23550500, -46633300, true, 38, MARKET_DURATION);
      await orderBook.connect(user1).deposit(1000n * PRECISION);
      await orderBook.connect(user2).deposit(1000n * PRECISION);

      // Place matching orders
      await orderBook.connect(user1).placeOrder(1, true, 600000n, 100n);
      await orderBook.connect(user2).placeOrder(1, false, 400000n, 100n);

      // Fast forward past market end
      await ethers.provider.send("evm_increaseTime", [MARKET_DURATION * 86400 + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should resolve market with YES outcome", async function () {
      const actualRainfall = 45; // More than historical avg (38)
      
      await oracle.submitWeatherData(1, actualRainfall);
      
      const tx = await orderBook.resolveMarket(1, actualRainfall);
      await expect(tx).to.emit(orderBook, "MarketResolved").withArgs(1, true);

      const market = await orderBook.getMarket(1);
      expect(market.resolved).to.equal(true);
      expect(market.outcome).to.equal(true); // YES won
    });

    it("Should resolve market with NO outcome", async function () {
      const actualRainfall = 30; // Less than historical avg (38)
      
      await oracle.submitWeatherData(1, actualRainfall);
      
      const tx = await orderBook.resolveMarket(1, actualRainfall);
      await expect(tx).to.emit(orderBook, "MarketResolved").withArgs(1, false);

      const market = await orderBook.getMarket(1);
      expect(market.outcome).to.equal(false); // NO won
    });

    it("Should allow winners to claim", async function () {
      const actualRainfall = 45;
      await oracle.submitWeatherData(1, actualRainfall);
      await orderBook.resolveMarket(1, actualRainfall);

      const balanceBefore = await orderBook.balances(user1.address);
      
      const tx = await orderBook.connect(user1).claimWinnings(1);
      await expect(tx).to.emit(orderBook, "WinningsClaimed");

      const balanceAfter = await orderBook.balances(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Balance Management", function () {
    it("Should deposit USDm", async function () {
      const amount = 100n * PRECISION;
      
      const tx = await orderBook.connect(user1).deposit(amount);
      await expect(tx).to.emit(orderBook, "Deposited").withArgs(user1.address, amount);

      const balance = await orderBook.balances(user1.address);
      expect(balance).to.equal(amount);
    });

    it("Should withdraw USDm", async function () {
      const amount = 100n * PRECISION;
      await orderBook.connect(user1).deposit(amount);

      const tx = await orderBook.connect(user1).withdraw(amount);
      await expect(tx).to.emit(orderBook, "Withdrawn").withArgs(user1.address, amount);

      const balance = await orderBook.balances(user1.address);
      expect(balance).to.equal(0);
    });

    it("Should not allow overdraft", async function () {
      await expect(
        orderBook.connect(user1).withdraw(1000n * PRECISION)
      ).to.be.revertedWithCustomError(orderBook, "InsufficientBalance");
    });
  });
});
