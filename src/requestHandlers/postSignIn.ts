import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { serialize } from "cookie";
import { StatusCodes } from "http-status-codes";
import { sign } from "jsonwebtoken";
import dynamodbClient, { usersTableName } from "../repositories/dynamodbClient";
import { USERS_HMAC_SECRET } from "../secret";
import { ErrorType, HttpError } from "../utils/error";
import getHash from "../utils/getHash";
import getHeaders from "../utils/headers";

type SignInRequestBody = {
  email: string;
  password: string;
};

const postSignIn = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getHeaders(),
    };
  }

  const getInvalidCredentialsHttpError = () =>
    new HttpError("invalid email or password", StatusCodes.UNAUTHORIZED, ErrorType.INVALID_CREDENTIALS);

  const reqBody = parseSignInRequestBody(event.body);

  const result = await dynamodbClient.send(
    new GetItemCommand({
      Key: {
        UserEmail: { S: reqBody.email },
      },
      TableName: usersTableName,
    }),
  );

  if (!result.Item) {
    throw getInvalidCredentialsHttpError();
  }

  const deviceId = result.Item["DeviceId"].S || "";
  const salt = result.Item["Salt"].S || "";

  const storedPasswordHash = result.Item["Password"].S || "";
  const reqPasswordHash = getHash(reqBody.password, salt);

  if (reqPasswordHash !== storedPasswordHash) {
    throw getInvalidCredentialsHttpError();
  }

  const token = sign(
    {
      uid: reqBody.email,
      deviceId: deviceId,
    },
    USERS_HMAC_SECRET,
    {
      expiresIn: "14 days",
    },
  );

  return {
    body: JSON.stringify({
      token,
    }),
    headers: {
      ...getHeaders,
      "Set-Cookie": serialize("token", token, {
        maxAge: 60 * 60 * 24 * 14,
        domain: event.headers["origin"],
        // secure: true,
      }),
    },
    statusCode: 200,
  };
};

export const parseSignInRequestBody = (body?: string): SignInRequestBody => {
  if (!body) {
    throw new Error();
  }

  try {
    const parsed = JSON.parse(body) as SignInRequestBody;

    if (!parsed.email || parsed.email === "") {
      throw new HttpError(
        "email field cannot be empty",
        StatusCodes.UNPROCESSABLE_ENTITY,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }

    if (!parsed.password || parsed.password === "") {
      throw new HttpError(
        "password field cannot be empty",
        StatusCodes.UNPROCESSABLE_ENTITY,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }

    return { ...parsed, email: parsed.email.toLowerCase() };
  } catch (e) {
    if (!(e instanceof HttpError)) {
      throw new HttpError("invalid request body", StatusCodes.BAD_REQUEST, ErrorType.INVALID_REQUEST_BODY);
    }

    throw e;
  }
};

export default postSignIn;
