# Wallet

A basic digital wallet with a RESTful API - encrypt and save wallet secrets, derive new keys/addresses, transfer tokens and assets, create and deploy smart contracts, etc.

## Running

Build the application and start it in Docker with

```bash
docker compose up
```

If you are a developer, you can also run it with `tsx`, i.e.

```bash
npx tsx src/index.ts
# or equivalently
npm run dev
```

## Wallet API

An HTTP-based API is exposed to facilitate interactions with the blockchain.

Available protocols (blockchains) are:

- [x] ethereum
- [x] bitcoin
- [x] stellar
- [x] ripple
- [ ] solana

See the `frontend.py` script for examples of using each API route. Alternatively, just run the script to interact with the wallet while it's running.

## Configuration

Environment variables for the application can be entered in the file `.env`. The available configuration options are:

- *MAINNET* - if set to `false`, all blockchain interactions will be testnet-only and some other configuration changes will be made
- *CONFIG_DIR* - sets the directory into which configuration files will be saved (by default set to `.data`)
- *RECOVERY_PHRASE_FILE* - the file which stores your encrypted recovery phrase at rest
- *WALLET_DATA_FILE* - the file which stores metadata associated with your wallet

## Security

The code in this project has not undergone a security audit in any way and you may use it at your own risk.

## Donations

Test that your wallet is configured properly by sending me your favorite token. 😉

- Bitcoin: bc1qwav8t5qfs4ygsl79y77waykhh29l046yqdvtm4
- Ethereum: 0x1429f4BE4E3032a2C36E577cf72EcD4C7AEf1ba5
- Ripple: rLwXknttqFwzgibVo7LECDgyEu5neBknrZ
