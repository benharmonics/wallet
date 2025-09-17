import express from "express";
import * as z from "zod";
import {
  WalletAddressOptions,
  WalletBalanceOptions,
  WalletManager,
} from "@wallet";
import { Protocol, Protocols } from "./provider";

const app = express();

app.use(express.json());

const AuthRequestBody = z.object({ password: z.string() });

app.post("/auth", async (req, res) => {
  let body;
  try {
    body = AuthRequestBody.parse(req.body);
  } catch (e) {
    res.status(400).send(e);
    return;
  }
  await WalletManager.auth(body.password)
    .then(() => console.log("Authenticated"))
    .then(() => res.send("OK"))
    .catch(() => res.status(401).send("Unauthorized"));
});

const AddressRequestQuery = z.object({
  addressIndex: z.coerce.number().positive().optional(),
});

function walletAddressOptions(
  protocol: Protocol,
  query: any,
): WalletAddressOptions {
  switch (protocol) {
    case "bitcoin":
      return { protocol };
    default:
      const { addressIndex } = AddressRequestQuery.parse(query);
      return { protocol, addressIndex };
  }
}

app.get("/address/:protocol", async (req, res) => {
  if (!WalletManager.wallet) {
    res.status(401).send("Unauthorized");
    return;
  }
  let protocol;
  try {
    protocol = z.enum(Protocols).parse(req.params.protocol);
  } catch (e) {
    res.status(400).send(e);
    return;
  }
  const opts = walletAddressOptions(protocol, req.query);
  await WalletManager.wallet
    .address(opts)
    .then((a) => res.send(a))
    .catch((e) => res.status(500).send(`Failed to get address: ${e}`));
});

const BalanceRequestQuery = z.object({
  addressIndex: z.coerce.number().positive().optional(),
  asset: z.string().optional(),
});

function walletBalanceOptions(
  protocol: Protocol,
  query: any,
): WalletBalanceOptions {
  switch (protocol) {
    case "bitcoin":
      return { protocol };
    default:
      const { addressIndex, asset } = BalanceRequestQuery.parse(query);
      return { protocol, addressIndex, asset };
  }
}

app.get("/balance/:protocol", async (req, res) => {
  if (!WalletManager.wallet) {
    res.status(401).send("Unauthorized");
    return;
  }
  let protocol;
  try {
    protocol = z.enum(Protocols).parse(req.params.protocol);
  } catch (e) {
    res.status(400).send(e);
    return;
  }
  const opts = walletBalanceOptions(protocol, req.query);
  await WalletManager.wallet
    .balance(opts)
    .then((b) => res.send(b))
    .catch((e) => res.status(500).send(`Failed to get balance: ${e}`));
});

const SendRequestBody = z.object({
  protocol: z.enum(Protocols).nonoptional(),
  destination: z.string().nonempty().nonoptional(),
  amount: z
    .number()
    .positive()
    .nonoptional()
    .transform((n) => n.toString()),
});

app.post("/send", async (req, res) => {
  if (!WalletManager.wallet) {
    res.status(401).send("Unauthorized");
    return;
  }
  let data;
  try {
    data = SendRequestBody.parse(req.body);
  } catch (e) {
    res.status(400).send(e);
    return;
  }
  await WalletManager.wallet
    .send(data)
    .then((ret) => res.json(ret))
    .catch((e) => res.status(500).send(`Failed to send transaction: ${e}`));
});

export default app;
