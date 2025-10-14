// src/hooks/useIsAdmin.ts
import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address, Abi } from "viem";
import { YEARNPASS1155_ABI } from "../lib/abi";

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

// Minimal ABI for role checks (avoids MARKET_ABI typing conflicts)
const ROLE_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { type: "bytes32", name: "role" },
      { type: "address", name: "account" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const satisfies Abi;

/**
 * Admin if wallet has DEFAULT_ADMIN_ROLE on Pass OR (optionally) on Market.
 * Market may not implement hasRole; we try/catch and treat as false if it reverts.
 */
export function useIsAdmin(pass: Address, market: Address) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let stop = false;

    (async () => {
      if (!address || !publicClient) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check Pass (known to support hasRole)
        const hasRolePass = (await publicClient.readContract({
          address: pass,
          abi: YEARNPASS1155_ABI,
          functionName: "hasRole",
          args: [DEFAULT_ADMIN_ROLE, address],
        })) as boolean;

        // Try Market with minimal ROLE_ABI; if method missing/reverts, treat as false
        let hasRoleMarket = false;
        try {
          hasRoleMarket = (await publicClient.readContract({
            address: market,
            abi: ROLE_ABI,
            functionName: "hasRole",
            args: [DEFAULT_ADMIN_ROLE, address],
          })) as boolean;
        } catch {
          hasRoleMarket = false;
        }

        if (!stop) setIsAdmin(Boolean(hasRolePass || hasRoleMarket));
      } catch {
        if (!stop) setIsAdmin(false);
      }
    })();

    return () => {
      stop = true;
    };
  }, [address, publicClient, pass, market]);

  return isAdmin;
}
