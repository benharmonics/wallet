import { Networkish } from "ethers";

export type Protocol = "ethereum";

export function providerRpcEndpoint(protocol: Protocol, network: Networkish) {
  switch (protocol) {
    case "ethereum":
      switch (network) {
        case "mainnet":
          return "https://ethereum-rpc.publicnode.com";
        case "sepolia":
          return "https://ethereum-sepolia-rpc.publicnode.com";
        case "holesky":
          return "https://ethereum-holesky-rpc.publicnode.com";
        default:
          throw new Error(`Unsupported Ethereum network ${network}`);
      }
    default:
      throw new Error(`Unsupported protocol ${protocol}`);
  }
}
