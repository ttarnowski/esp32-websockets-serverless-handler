import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult } from "aws-lambda";
import { verify, JwtPayload } from "jsonwebtoken";
import dynamodbClient, { clientsTable } from "../repositories/dynamodbClient";
import { USERS_HMAC_SECRET } from "../secret";
import { responseOK } from "../utils/responseOK";

enum ClientType {
  Device = "device",
  WebUI = "webui",
}

const getQueryParam = (
  key: string,
  queryParams: APIGatewayProxyEventQueryStringParameters | null,
): string | undefined => {
  if (queryParams === null) {
    return undefined;
  }

  return queryParams[key];
};

const extractDeviceIdFromToken = (token: string): string => {
  const decodedToken = verify(token, USERS_HMAC_SECRET) as JwtPayload;
  return decodedToken["deviceId"];
};

export const handleConnect = async (
  connectionId: string,
  queryParams: APIGatewayProxyEventQueryStringParameters | null,
): Promise<APIGatewayProxyResult> => {
  const clientType = getQueryParam("clientType", queryParams) || ClientType.Device;
  const token = getQueryParam("token", queryParams) || "";

  const deviceId =
    clientType === ClientType.Device ? getQueryParam("deviceId", queryParams) || "" : extractDeviceIdFromToken(token);

  // TODO: implement device id/secret auth

  await dynamodbClient.send(
    new PutItemCommand({
      TableName: clientsTable,
      Item: {
        connectionId: {
          S: connectionId,
        },
        clientType: {
          S: clientType,
        },
        deviceId: {
          S: deviceId,
        },
      },
    }),
  );

  return responseOK;
};
