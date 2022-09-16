import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteItemCommand, DynamoDBClient, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApi, GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { TextEncoder } from "util";

const responseOK = {
  statusCode: 200,
  body: "",
};
const dynamodbClient = new DynamoDBClient({});
const apiGatewayManagementApi = new ApiGatewayManagementApi({
  endpoint: process.env["WSSAPIGATEWAYENDPOINT"],
});
const clientsTable = process.env["CLIENTS_TABLE_NAME"] || "";
const textEncoder = new TextEncoder();

export const handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId as string;
  const routeKey = event.requestContext.routeKey as string;
  const body = event.body || "";

  switch (routeKey) {
    case "$connect":
      return handleConnect(connectionId);
    case "$disconnect":
      return handleDisconnect(connectionId);
    case "msg":
      return handleMsg(connectionId, body);
  }

  return {
    statusCode: 200,
    body: "",
  };
};

const handleConnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  await dynamodbClient.send(
    new PutItemCommand({
      TableName: clientsTable,
      Item: {
        connectionId: {
          S: connectionId,
        },
      },
    }),
  );

  return responseOK;
};
const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  await dynamodbClient.send(
    new DeleteItemCommand({
      TableName: clientsTable,
      Key: {
        connectionId: {
          S: connectionId,
        },
      },
    }),
  );

  return responseOK;
};

const handleMsg = async (thisConnectionId: string, body: string): Promise<APIGatewayProxyResult> => {
  const output = await dynamodbClient.send(
    new ScanCommand({
      TableName: clientsTable,
    }),
  );

  if (output.Count && output.Count > 0) {
    for (const item of output.Items || []) {
      if (item["connectionId"].S !== thisConnectionId) {
        await sendMessage(item["connectionId"].S as string, body);
      }
    }
  } else {
    await sendMessage(thisConnectionId, JSON.stringify({ action: "msg", type: "warning", body: "no recipient" }));
  }

  return responseOK;
};

const sendMessage = async (connectionId: string, body: string) => {
  try {    
    await apiGatewayManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: textEncoder.encode(body),
    });
  } catch (e) {
    if (e instanceof GoneException) {
      await handleDisconnect(connectionId);
      return;
    }

    throw e;
  }
};
