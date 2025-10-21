import { Asset } from "@stellar/stellar-sdk";

export const SUSD = () => new Asset(process.env.NEXT_PUBLIC_SUSD_CODE!, process.env.NEXT_PUBLIC_SUSD_ISSUER!);
