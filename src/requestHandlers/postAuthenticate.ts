import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { sign } from "jsonwebtoken";
import dynamodbClient, { apiClientsTable } from "../repositories/dynamodbClient";
import { API_CLIENTS_HMAC_SECRET } from "../secret";
import { ErrorType, HttpError } from "../utils/error";
import getHash from "../utils/getHash";
import getHeaders from "../utils/headers";

type AuthenticateRequestBody = {
  clientId: string;
  secret: string;
};

const postAuthenticate = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const reqBody = parseAuthenticateRequestBody(event.body as string);

  const apiClientResult = await dynamodbClient.send(
    new GetItemCommand({
      Key: {
        ApiClientId: { S: reqBody.clientId },
      },
      TableName: apiClientsTable,
    }),
  );

  if (!apiClientResult.Item) {
    throw new HttpError("invalid credentials", StatusCodes.UNAUTHORIZED, ErrorType.INVALID_CREDENTIALS);
  }

  const clientId = apiClientResult.Item["ApiClientId"].S;
  const secret = apiClientResult.Item["Secret"].S as string;
  const salt = apiClientResult.Item["Salt"].S as string;

  if (clientId !== reqBody.clientId || secret !== getHash(reqBody.secret, salt)) {
    throw new HttpError("invalid credentials", StatusCodes.UNAUTHORIZED, ErrorType.INVALID_CREDENTIALS);
  }

  const token = sign(
    {
      uid: reqBody.clientId,
    },
    API_CLIENTS_HMAC_SECRET,
    {
      expiresIn: "14 days",
    },
  );

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify({ authToken: token }),
  };
};

const parseAuthenticateRequestBody = (body: string): AuthenticateRequestBody => {
  try {
    const parsed = JSON.parse(body) as AuthenticateRequestBody;

    if (!parsed.clientId || typeof parsed.clientId !== "string") {
      throw new HttpError("clientId is invalid", StatusCodes.UNPROCESSABLE_ENTITY, ErrorType.INVALID_CREDENTIALS);
    }

    if (!parsed.secret || typeof parsed.secret !== "string") {
      throw new HttpError("secret is invalid", StatusCodes.UNPROCESSABLE_ENTITY, ErrorType.INVALID_CREDENTIALS);
    }

    return parsed;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new HttpError(
        "request body must be in a JSON format",
        StatusCodes.BAD_REQUEST,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }

    throw e;
  }
};

export default postAuthenticate;
