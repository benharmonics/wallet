# Wallet

A basic digital wallet - transfer tokens and assets, create and deploy smart contracts, etc.

## Wallet API

An HTTP-based API is exposed to facilitate interactions with the blockchain.

Available protocols are:

- ethereum
- bitcoin
- stellar
- ripple

### Routes

#### GET /auth

Authenticate with the server.

**Request body**

```json
{
    "password": "<your password>"
}
```

#### GET /address/:protocol

Get your address on a given blockchain protocol (e.g. "ethereum", "bitcoin", etc.).

**Query parameters**

- addressIndex - an integer from 0 to 2^31 - 1 to derive new addresses (defaults to 0)

#### GET /balance/:protocol

Get your balance on a given blockchain protocol (e.g. "ethereum", "bitcoin", etc.).

**Query parameters**

- addressIndex - an integer from 0 to 2^31 - 1 to derive new addresses (defaults to 0)
- asset - a non-native asset available for the given protocol

#### POST /send

Send some of a given token or asset.

**Request body**

```json
{
    "protocol": "<some protocol>",
    "destination": "<some address>",
    "amount": 0.02
}
```

## Configuration and Testing

The static configuration for the application should be entered in the environment file `.env`. The available configuration options are:

- PORT - the exposed port at which you can access the Wallet API
- MAINNET - if set to `false`, all blockchain interactions will be testnet-only

## Security

The code in this project has not undergone a security audit in any way and you may use it at your own risk.
