import { getReasonPhrase, StatusCodes } from "http-status-codes";
import express from "express";
import * as z from "zod";
import {
  WalletAddressOptions,
  WalletBalanceOptions,
  WalletManager,
} from "@wallet";
import { Protocols } from "./provider";

type Result<TData, TError> =
  | { type: "success"; data: TData }
  | { type: "error"; error: TError };

function respond(
  req: express.Request,
  res: express.Response,
  statusCode: number,
  data: unknown,
  error?: unknown,
) {
  res.status(statusCode).json({
    timestamp: new Date(),
    route: req.path,
    method: req.method,
    status: getReasonPhrase(statusCode),
    statusCode,
    data,
    error,
  });
}

function respondError(
  req: express.Request,
  res: express.Response,
  err: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
) {
  respond(req, res, statusCode, null, err);
}

const app = express();
const walletApi = express.Router();

// auth check
walletApi.use((req, res, next) => {
  if (!WalletManager.isAuthenticated) {
    respondError(req, res, "not logged in", StatusCodes.UNAUTHORIZED);
    return;
  }
  next();
});

app.use(express.json());
app.use("/wallet", walletApi);

if (process.env.NODE_ENV !== "production") {
  app.set("json spaces", 2);
}

const ZProtocol = z.enum(Protocols);

const LoginRequestBody = z.object({ password: z.string() });

app.post("/login", async (req, res) => {
  let body = LoginRequestBody.safeParse(req.body);
  if (!body.success) {
    respondError(req, res, body.error.message, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.auth(body.data.password)
    .then(() => console.log("Authenticated"))
    .then(() => respond(req, res, StatusCodes.OK, null))
    .catch((e) => respondError(req, res, e, StatusCodes.UNAUTHORIZED));
});

app.post("/logout", (req, res) => {
  WalletManager.logout();
  respond(req, res, StatusCodes.OK, null);
});

app.get("/whoami", (req, res) => {
  const data = { loggedIn: WalletManager.isAuthenticated };
  respond(req, res, StatusCodes.OK, data);
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

const KeystorePostRequestBody = z.object({
  password: z.string().nonoptional(),
  mnemonic: z.string().nonoptional(),
});

app.post("/keystore", async (req, res) => {
  let body = KeystorePostRequestBody.safeParse(req.body);
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

const WalletPutRequestBody = z.object({
  action: z.enum(["add", "remove"]).nonoptional(),
  protocol: ZProtocol.nonoptional(),
  addressIndex: z.number().int().gte(0).nonoptional(),
});

walletApi.put("/", async (req, res) => {
  const body = WalletPutRequestBody.safeParse(req.body);
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

const AddressRequestQuery = z.object({
  addressIndex: z.coerce.number().int().gte(0).optional(),
});

function walletAddressOptions(
  req: express.Request,
): Result<WalletAddressOptions, string> {
  const parsed = ZProtocol.safeParse(req.params.protocol);
  if (!parsed.success) {
    return { type: "error", error: parsed.error.message };
  }
  const protocol = parsed.data;
  switch (protocol) {
    case "bitcoin":
      return { type: "success", data: { protocol } };
    default:
      const parsed = AddressRequestQuery.safeParse(req.query);
      if (!parsed.success) {
        return { type: "error", error: `bad query: ${parsed.error.message}` };
      }
      const { addressIndex } = parsed.data;
      return { type: "success", data: { protocol, addressIndex } };
  }
}

walletApi.get("/address/:protocol", async (req, res) => {
  const opts = walletAddressOptions(req);
  if (opts.type === "error") {
    respondError(req, res, opts.error, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.address(opts.data)
    .then((a) => respond(req, res, StatusCodes.OK, a))
    .catch((e) => respondError(req, res, `Failed to get address: ${e}`));
});

const BalanceRequestQuery = z.object({
  addressIndex: z.coerce.number().int().gte(0).optional(),
  asset: z.string().optional(),
});

function walletBalanceOptions(
  req: express.Request,
): Result<WalletBalanceOptions, string> {
  const parsed = ZProtocol.safeParse(req.params.protocol);
  if (!parsed.success) {
    return { type: "error", error: parsed.error.message };
  }
  const protocol = parsed.data;
  switch (protocol) {
    case "bitcoin":
      return { type: "success", data: { protocol } };
    default:
      const parsed = BalanceRequestQuery.safeParse(req.query);
      if (!parsed.success) {
        return { type: "error", error: `bad query: ${parsed.error.message}` };
      }
      const { addressIndex, asset } = parsed.data;
      return { type: "success", data: { protocol, addressIndex, asset } };
  }
}

walletApi.get("/balance/:protocol", async (req, res) => {
  const opts = walletBalanceOptions(req);
  if (opts.type === "error") {
    respondError(req, res, opts.error, StatusCodes.BAD_REQUEST);
    return;
  }
  await WalletManager.wallet!.balance(opts.data)
    .then((b) => respond(req, res, StatusCodes.OK, b))
    .catch((e) => respondError(req, res, `Failed to get balance: ${e}`));
});

const SendRequestBody = z.object({
  protocol: ZProtocol.nonoptional(),
  destination: z.string().nonempty().nonoptional(),
  amount: z
    .number()
    .gte(0)
    .nonoptional()
    .transform((n) => n.toString()),
  addressIndex: z.number().int().gte(0).optional(),
  asset: z
    .string()
    .nullable()
    .transform((s) => s ?? ""),
});

walletApi.post("/send", async (req, res) => {
  let body = SendRequestBody.safeParse(req.body);
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
