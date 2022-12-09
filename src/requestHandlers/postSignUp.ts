import { GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { TextEncoder } from "util";
import { v4 } from "uuid";
import { createDevice } from "../repositories/Devices";
import dynamodbClient, { clientsTable, deviceKeysTable, usersTableName } from "../repositories/dynamodbClient";
import { ErrorType, HttpError } from "../utils/error";
import getHash from "../utils/getHash";
import getHeaders from "../utils/headers";
import { apiGatewayManagementApi, sendWSMessage } from "../utils/sendWSMessage";
import { parseSignInRequestBody } from "./postSignIn";

type SignUpRequestBody = {
  email: string;
  password: string;
  secret: string;
};

const postSignUp = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getHeaders(),
    };
  }

  const reqBody = parseSignUpRequestBody(event.body);

  const keyResult = await dynamodbClient.send(
    new GetItemCommand({
      Key: {
        KeyId: { S: reqBody.secret },
      },
      TableName: deviceKeysTable,
    }),
  );

  if (!keyResult.Item) {
    throw new HttpError("invalid secret", StatusCodes.BAD_REQUEST, ErrorType.INVALID_REQUEST_BODY);
  }

  const connectionId = keyResult.Item["connectionId"].S || "";
  const connResult = await dynamodbClient.send(
    new GetItemCommand({
      Key: {
        connectionId: { S: connectionId },
      },
      TableName: clientsTable,
    }),
  );

  if (!connResult.Item) {
    throw new HttpError(
      "could not connect with AquaStat, account cannot be created",
      StatusCodes.GONE,
      ErrorType.INVALID_REQUEST_BODY,
    );
  }

  await tryToSendPingMessage(connectionId);

  const salt = v4();
  const deviceId = v4().slice(0, 12);
  const deviceKey = v4().slice(0, 12);

  await dynamodbClient.send(
    new PutItemCommand({
      Item: {
        UserEmail: { S: reqBody.email },
        Salt: { S: salt },
        Password: { S: getHash(reqBody.password, salt) },
        DeviceId: { S: deviceId },
        DeviceKey: { S: deviceKey },
      },
      TableName: usersTableName,
    }),
  );

  await createDevice({
    deviceId,
    deviceKey,
    mode: 0,
  });

  await sendWSMessage(
    connectionId,
    JSON.stringify({
      action: "msg",
      type: "signedUp",
      deviceId,
      deviceKey,
    }),
  );

  return {
    body: JSON.stringify({ status: "ok" }),
    statusCode: 200,
    headers: getHeaders(),
  };
};

const tryToSendPingMessage = async (connectionId: string) => {
  const textEncoder = new TextEncoder();

  try {
    await apiGatewayManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: textEncoder.encode(JSON.stringify({ action: "msg", type: "ping" })),
    });
  } catch (e) {
    if (e instanceof GoneException) {
      throw new HttpError(
        "could not connect with AquaStat, account cannot be created",
        StatusCodes.GONE,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }
    throw e;
  }
};

const parseSignUpRequestBody = (body?: string): SignUpRequestBody => {
  if (!body) {
    throw new Error();
  }

  try {
    const signInParsed = parseSignInRequestBody(body);

    const parsed = signInParsed as SignUpRequestBody;

    if (!parsed.secret || parsed.secret === "") {
      throw new HttpError(
        "secret field cannot be empty",
        StatusCodes.UNPROCESSABLE_ENTITY,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }

    return parsed;
  } catch (e) {
    if (!(e instanceof HttpError)) {
      throw new HttpError("invalid request body", StatusCodes.BAD_REQUEST, ErrorType.INVALID_REQUEST_BODY);
    }

    throw e;
  }
};

export default postSignUp;
