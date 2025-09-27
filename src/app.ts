import express from "express";
import { StatusCodes } from "http-status-codes";
import * as z from "zod";
import {
  WalletAddressOptions,
  WalletBalanceOptions,
  WalletManager,
} from "@wallet";
import { signJwt } from "@utils/auth";
import { Protocols } from "./provider";
import { respond, respondError } from "./response";
import { jwtSecret, verifyAuthHeader, verifyJwtMiddleware } from "./middleware";
import { Result } from "@utils/types/result";

const app = express();
const walletApi = express.Router();

app.use(express.json());
if (process.env.NODE_ENV !== "production") {
  app.set("json spaces", 2);
}
app.use("/wallet", walletApi);

walletApi.use(verifyJwtMiddleware);

const ZProtocol = z.enum(Protocols);
const ZBip32AddressIndex = z.coerce
  .number()
  .int()
  .gte(0, "invalid BIP32 address index - must be positive")
  .lt(Math.pow(2, 32), "invalid BIP32 address index - out of range")
  .optional();

const ZLoginRequestBody = z.object({ password: z.string() });

app.post("/login", async (req, res) => {
  let body = ZLoginRequestBody.safeParse(req.body);
  if (!body.success) {
    respondError(req, res, body.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.auth(body.data.password)
    .then(() => console.log("Authenticated"))
    .then(() => {
      const accessToken = signJwt(jwtSecret);
      respond(req, res, StatusCodes.OK, { accessToken });
    })
    .catch((e) => respondError(req, res, e, StatusCodes.UNAUTHORIZED));
});

app.post("/logout", (req, res) => {
  WalletManager.disconnect();
  respond(req, res, StatusCodes.OK, null);
});

app.get("/whoami", (req, res) => {
  const result = verifyAuthHeader(req);
  if (!result.ok) {
    respondError(req, res, result.error, StatusCodes.UNAUTHORIZED);
    return;
  }
  respond(req, res, StatusCodes.OK, result.data);
});

app.post("/refresh", (req, res) => {
  const { ok } = verifyAuthHeader(req);
  if (!ok) {
    respondError(req, res, "invalid refresh token", StatusCodes.UNAUTHORIZED);
    return;
  }
  const accessToken = signJwt(jwtSecret);
  respond(req, res, StatusCodes.OK, { accessToken });
});

app.get("/info", async (req, res) => {
  respond(req, res, StatusCodes.OK, WalletManager.info);
});

app.get("/info/:protocol", async (req, res) => {
  const proto = ZProtocol.safeParse(req.params.protocol);
  if (!proto.success) {
    respondError(req, res, proto.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  const info = WalletManager.info.blockchains[proto.data];
  respond(req, res, StatusCodes.OK, info);
});

app.get("/keystore", async (req, res) => {
  const data = {
    mainnet: WalletManager.isMainnet,
    keystoreExists: await WalletManager.keystoreExists(),
  };
  respond(req, res, StatusCodes.OK, data);
});

const ZKeystorePostRequestBody = z.object({
  password: z.string().min(1, "password must be nonempty").nonoptional(),
  mnemonic: z.string().trim().min(1, "given mnemonic is empty").nonoptional(),
});

app.post("/keystore", async (req, res) => {
  let body = ZKeystorePostRequestBody.safeParse(req.body);
  if (!body.success) {
    respondError(req, res, body.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.saveNew(body.data.mnemonic, body.data.password)
    .then(() => console.log("Saved new wallet"))
    .then(() => respond(req, res, StatusCodes.CREATED, "Saved new wallet"))
    .catch((e) => respondError(req, res, e));
});

walletApi.get("/", async (req, res) => {
  respond(req, res, StatusCodes.OK, WalletManager.wallet!.accounts);
});

const ZWalletPutRequestBody = z.object({
  action: z.enum(["add", "remove"]).nonoptional(),
  protocol: ZProtocol.nonoptional(),
  addressIndex: z.number().int().gte(0).nonoptional(),
});

walletApi.put("/", async (req, res) => {
  const body = ZWalletPutRequestBody.safeParse(req.body);
  if (!body.success) {
    respondError(req, res, body.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.updateAccount(
    body.data.action,
    body.data.protocol,
    body.data.addressIndex,
  )
    .then(() => respond(req, res, StatusCodes.ACCEPTED, null))
    .catch((e) => respondError(req, res, e));
});

const ZAddressRequestQuery = z.object({ addressIndex: ZBip32AddressIndex });

function walletAddressOptions(
  req: express.Request,
): Result<WalletAddressOptions, string> {
  const parsed = ZProtocol.safeParse(req.params.protocol);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const protocol = parsed.data;
  switch (protocol) {
    case "bitcoin":
      return { ok: true, data: { protocol } };
    default:
      const parsed = ZAddressRequestQuery.safeParse(req.query);
      if (!parsed.success) {
        return { ok: false, error: `bad query: ${parsed.error.message}` };
      }
      const { addressIndex } = parsed.data;
      return { ok: true, data: { protocol, addressIndex } };
  }
}

walletApi.get("/address/:protocol", async (req, res) => {
  const optsResult = walletAddressOptions(req);
  if (!optsResult.ok) {
    respondError(req, res, optsResult.error, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.address(optsResult.data)
    .then((a) => respond(req, res, StatusCodes.OK, a))
    .catch((e) => respondError(req, res, `Failed to get address: ${e}`));
});

const ZBalanceRequestQuery = z.object({
  addressIndex: ZBip32AddressIndex,
  asset: z.string().trim().optional(),
});

function walletBalanceOptions(
  req: express.Request,
): Result<WalletBalanceOptions, string> {
  const parsed = ZProtocol.safeParse(req.params.protocol);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const protocol = parsed.data;
  switch (protocol) {
    case "bitcoin":
      return { ok: true, data: { protocol } };
    default:
      const parsed = ZBalanceRequestQuery.safeParse(req.query);
      if (!parsed.success) {
        return { ok: false, error: `bad query: ${parsed.error.message}` };
      }
      const { addressIndex, asset } = parsed.data;
      return { ok: true, data: { protocol, addressIndex, asset } };
  }
}

walletApi.get("/balance/:protocol", async (req, res) => {
  const optsResult = walletBalanceOptions(req);
  if (!optsResult.ok) {
    respondError(req, res, optsResult.error, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.balance(optsResult.data)
    .then((b) => respond(req, res, StatusCodes.OK, b))
    .catch((e) => respondError(req, res, `Failed to get balance: ${e}`));
});
const ZSendRequestBody = z.object({
  protocol: ZProtocol.nonoptional(),
  destination: z
    .string()
    .trim()
    .min(0, "destination is required")
    .nonoptional(),
  amount: z
    .number()
    .gte(0, "amount must be positive")
    .nonoptional()
    .transform((n) => n.toString()),
  addressIndex: ZBip32AddressIndex,
  asset: z
    .string()
    .trim()
    .nullable()
    .transform((s) => s ?? ""),
});

walletApi.post("/send", async (req, res) => {
  console.log(req.body);
  let body = ZSendRequestBody.safeParse(req.body);
  if (!body.success) {
    respondError(req, res, body.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.send(body.data)
    .then((ret) => {
      console.log(`Submitted transaction: ${JSON.stringify(ret, null, 2)}`);
      respond(req, res, StatusCodes.OK, ret);
    })
    .catch((e) => respondError(req, res, e));
});

export default app;
