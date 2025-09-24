import express from "express";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import * as z from "zod";
import {
  WalletAddressOptions,
  WalletBalanceOptions,
  WalletManager,
} from "@wallet";
import { signJwt, verifyJwt } from "@utils/auth";
import { Protocols } from "./provider";

const JWT_SECRET = "my secret"; // TODO: remove and replace with environment variable

type Result<TData, TError> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

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

// JWT check - RFC6750 `Authorization: Bearer ...` format
function verifyAuthHeader(
  req: express.Request,
): Result<string | JwtPayload, string> {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return {
      ok: false,
      error: "header 'Authorization: Bearer <your JWT>' is required",
    };
  }
  const apiKey = authHeader.split("Bearer ")[1];
  const res = verifyJwt(apiKey, JWT_SECRET);
  if (!res.ok) {
    return {
      ok: false,
      error:
        "invalid JWT - please format your header e.g. 'Authorization: Bearer <your JWT>'",
    };
  }
  return { ok: true, data: res.decodedToken };
}

const app = express();
const walletApi = express.Router();

// Validate JWT middleware
walletApi.use((req, res, next) => {
  const result = verifyAuthHeader(req);
  if (!result.ok) {
    respondError(req, res, result.error, StatusCodes.UNAUTHORIZED);
    return;
  }
  next();
});

app.use("/wallet", walletApi);
app.use(express.json());
if (process.env.NODE_ENV !== "production") {
  app.set("json spaces", 2);
}

const ZProtocol = z.enum(Protocols);

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
      const accessToken = signJwt(JWT_SECRET);
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
  const accessToken = signJwt(JWT_SECRET);
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
  password: z.string().nonoptional(),
  mnemonic: z.string().nonoptional(),
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

const ZAddressRequestQuery = z.object({
  addressIndex: z.coerce.number().int().gte(0).optional(),
});

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
  addressIndex: z.coerce.number().int().gte(0).optional(),
  asset: z.string().optional(),
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
