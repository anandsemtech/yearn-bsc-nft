import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Address } from "viem";
import { YEARNPASS1155_ABI, MARKET_ABI } from "../lib/abi";

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export function useIsAdmin(pass: Address, market: Address) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!address || !publicClient) return setIsAdmin(false);
      try {
        const [a, b] = await Promise.all([
          publicClient.readContract({
            address: pass,
            abi: YEARNPASS1155_ABI,
            functionName: "hasRole",
            args: [DEFAULT_ADMIN_ROLE, address],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: market,
            abi: MARKET_ABI,
            functionName: "hasRole",
            args: [DEFAULT_ADMIN_ROLE, address],
          }) as Promise<boolean>,
        ]);
        if (!stop) setIsAdmin(Boolean(a || b));
      } catch {
        if (!stop) setIsAdmin(false);
      }
    })();
    return () => { stop = true; };
  }, [address, publicClient, pass, market]);

  return isAdmin;
}
