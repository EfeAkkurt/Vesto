"use client";

import { useEffect, useState } from "react";
import { networkHealth as mockNetworkHealth, type NetworkHealth } from "@/src/lib/mockData";

export const useNetworkHealth = (): NetworkHealth => {
  const [health, setHealth] = useState<NetworkHealth>(mockNetworkHealth);

  useEffect(() => {
    setHealth(mockNetworkHealth);
  }, []);

  return health;
};
