export type Protocol = "ethereum" | "bitcoin";

export function providerRpcEndpoint(protocol: Protocol, network: string) {
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
    case "bitcoin":
      switch (network) {
        case "mainnet":
          return "https://bitcoin-rpc.publicnode.com";
        case "testnet":
          return "https://bitcoin-testnet-rpc.publicnode.com";
      }
    default:
      throw new Error(`Unsupported protocol ${protocol}`);
  }
}
