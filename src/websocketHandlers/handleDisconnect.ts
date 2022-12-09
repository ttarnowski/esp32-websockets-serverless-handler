import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import dynamodbClient, { clientsTable } from "../repositories/dynamodbClient";
import { responseOK } from "../utils/responseOK";

export const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
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
