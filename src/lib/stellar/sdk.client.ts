'use client';

import * as Freighter from "@stellar/freighter-api";

export type FreighterApiModule = typeof Freighter;

export const getBrowser = () => ({ freighter: Freighter });

export const getFreighterApi = (): FreighterApiModule => Freighter;
