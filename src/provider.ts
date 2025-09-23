export const Protocols = [
  "ethereum",
  "bitcoin",
  "ripple",
  "stellar",
  "solana",
] as const;
export type Protocol = (typeof Protocols)[number];

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
        case "hoodi":
          return "https://ethereum-hoodi-rpc.publicnode.com";
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
    case "ripple":
      switch (network) {
        case "testnet":
          return "wss://s.altnet.rippletest.net:51233";
        case "devnet":
          return "wss://s.devnet.rippletest.net:51233";
        case "mainnet":
          return "wss://xrplcluster.com";
      }
    case "stellar":
      switch (network) {
        case "mainnet":
          return "https://horizon.stellar.lobstr.co";
        case "testnet":
          return "https://horizon-testnet.stellar.org";
      }
    default:
      throw new Error(`Unsupported protocol/network: ${protocol}/${network}`);
  }
}
