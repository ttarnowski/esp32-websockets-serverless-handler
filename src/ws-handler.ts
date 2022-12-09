import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handleFirmwareCheck } from "./websocketHandlers/handleFirmwareCheck";
import { handleConnect } from "./websocketHandlers/handleConnect";
import { handleDisconnect } from "./websocketHandlers/handleDisconnect";
import { handleSignUp } from "./websocketHandlers/handleSignUp";
import { handleRequest } from "./websocketHandlers/handleRequest";
import { handleMsg } from "./websocketHandlers/handleMsg";

export const handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId as string;
  const routeKey = event.requestContext.routeKey as string;
  const body = event.body || "";
  console.log(routeKey, body);

  switch (routeKey) {
    case "$connect":
      return handleConnect(connectionId, event.queryStringParameters);
    case "$disconnect":
      return handleDisconnect(connectionId);
    case "msg":
      return handleMsg(connectionId, body);
    case "signUp":
      return handleSignUp(connectionId);
    case "request":
      return handleRequest(connectionId, body);
    case "firmwareCheck":
      return handleFirmwareCheck(connectionId, body);
  }

  return {
    statusCode: 200,
    body: "",
  };
};
