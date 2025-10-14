import type { Abi } from "viem";

export const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const satisfies Abi;

export const YEARNPASS1155_ABI = [
  // views
  { type: "function", name: "uri", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "uint256" }] },
  // roles (for admin panel)
  { type: "function", name: "ADMIN_ROLE", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "TRANSFER_ROLE", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "hasRole", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "bool" }] },
  // admin
  { type: "function", name: "setAllowedTransferTo", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "adminMove", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "configureTier", stateMutability: "nonpayable", inputs: [
      { type: "uint256" },
      { components: [
          { name: "maxSupply", type: "uint64" },
          { name: "minted", type: "uint64" },
          { name: "uri", type: "string" },
          { name: "tokenExpiry", type: "uint32" },
          { name: "burnOnConsume", type: "bool" },
        ], type: "tuple" }
    ], outputs: [] },
] as const satisfies Abi;

export const MARKET_ABI = [
  // buy & price
  { type: "function", name: "priceOf", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buy", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [] },
  // admin
  { type: "function", name: "setPrices", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "setWhitelist", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address" }, { type: "bool" }], outputs: [] },
  // optional batch (we’ll try/catch)
  { type: "function", name: "setWhitelistBatch", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address[]" }, { type: "bool" }], outputs: [] },
] as const satisfies Abi;
