import express from "express";
import * as z from "zod";
import {
  WalletAddressOptions,
  WalletBalanceOptions,
  WalletManager,
} from "@wallet";
import { Protocol, Protocols } from "./provider";
import { getReasonPhrase, StatusCodes } from "http-status-codes";

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

const app = express();

app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.set("json spaces", 2);
}

const ZProtocol = z.enum(Protocols);

const AuthRequestBody = z.object({ password: z.string() });

app.post("/auth", async (req, res) => {
  let body;
  try {
    body = AuthRequestBody.parse(req.body);
  } catch (e) {
    respond(req, res, StatusCodes.BAD_REQUEST, null, e);
    return;
  }
  await WalletManager.auth(body.password)
    .then(() => console.log("Authenticated"))
    .then(() => respond(req, res, StatusCodes.OK, null))
    .catch((e) => respond(req, res, StatusCodes.UNAUTHORIZED, null, e));
});

app.get("/wallet", async (req, res) => {
  if (!WalletManager.isAuthenticated) {
    respond(
      req,
      res,
      StatusCodes.UNAUTHORIZED,
      null,
      "user is not authenticated",
    );
    return;
  }
  respond(req, res, StatusCodes.OK, WalletManager.wallet!.accounts);
});

const WalletPostRequestBody = z.object({
  password: z.string().nonoptional(),
  mnemonic: z.string().nonoptional(),
});

app.post("/wallet", async (req, res) => {
  let data;
  try {
    data = WalletPostRequestBody.parse(req.body);
  } catch (e) {
    respond(req, res, StatusCodes.BAD_REQUEST, null, e);
    return;
  }
  await WalletManager.saveNew(data.mnemonic, data.password)
    .then(() => console.log("Saved new wallet"))
    .then(() => respond(req, res, StatusCodes.CREATED, "Saved new wallet"))
    .catch((e) =>
      respond(req, res, StatusCodes.INTERNAL_SERVER_ERROR, null, e),
    );
});

const AddressRequestQuery = z.object({
  addressIndex: z.coerce.number().int().gte(0).optional(),
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

app.use("/address/:protocol", (req, res, next) => {
  if (!WalletManager.isAuthenticated) {
    respond(
      req,
      res,
      StatusCodes.UNAUTHORIZED,
      null,
      "user is not authenticated",
    );
    return;
  }
  next();
});

app.get("/address/:protocol", async (req, res) => {
  let protocol;
  try {
    protocol = ZProtocol.parse(req.params.protocol);
  } catch (e) {
    respond(req, res, StatusCodes.BAD_REQUEST, null, e);
    return;
  }
  const opts = walletAddressOptions(protocol, req.query);
  await WalletManager.wallet!.address(opts)
    .then((a) => respond(req, res, StatusCodes.OK, a))
    .catch((e) =>
      respond(
        req,
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        null,
        `Failed to get address: ${e}`,
      ),
    );
});

const BalanceRequestQuery = z.object({
  addressIndex: z.coerce.number().int().gte(0).optional(),
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

app.use("/balance/:protocol", (req, res, next) => {
  if (!WalletManager.isAuthenticated) {
    respond(
      req,
      res,
      StatusCodes.UNAUTHORIZED,
      null,
      "user is not authenticated",
    );
    return;
  }
  next();
});

app.get("/balance/:protocol", async (req, res) => {
  let protocol;
  try {
    protocol = ZProtocol.parse(req.params.protocol);
  } catch (e) {
    respond(req, res, StatusCodes.BAD_REQUEST, null, e);
    return;
  }
  const opts = walletBalanceOptions(protocol, req.query);
  await WalletManager.wallet!.balance(opts)
    .then((b) => respond(req, res, StatusCodes.OK, b))
    .catch((e) =>
      respond(
        req,
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        null,
        `Failed to get balance: ${e}`,
      ),
    );
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
  asset: z.string().optional(),
});

app.use("/send", (req, res, next) => {
  if (!WalletManager.isAuthenticated) {
    respond(
      req,
      res,
      StatusCodes.UNAUTHORIZED,
      null,
      "user is not authenticated",
    );
    return;
  }
  next();
});

app.post("/send", async (req, res) => {
  let data;
  try {
    data = SendRequestBody.parse(req.body);
  } catch (e) {
    respond(req, res, StatusCodes.BAD_REQUEST, null, e);
    return;
  }
  await WalletManager.wallet!.send(data)
    .then((ret) => {
      console.log(`Submitted transaction: ${JSON.stringify(ret, null, 2)}`);
      respond(req, res, StatusCodes.OK, ret);
    })
    .catch((e) =>
      respond(req, res, StatusCodes.INTERNAL_SERVER_ERROR, null, e),
    );
});

export default app;
