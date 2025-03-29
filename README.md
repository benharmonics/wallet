# Wallet

A basic Ethereum wallet - transfer ETH, ERC20 tokens, create and deploy smart contracts, etc.

## Security

Use of this wallet depends on having your BIP39 mnemonic stored in an environment variable, `MNEMONIC`. The project reads your environment variables from the `.env` file in the root directory, so follow whatever procedures you need to do to secure the mnemonic for your use case.

That being said, the code in this project has not undergone a security audit in any way and you may **use it at your own risk**.
