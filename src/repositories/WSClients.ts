import { AttributeValue, GetItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import dynamodbClient, { clientsTable, deviceIdIndexName } from "./dynamodbClient";
import { RepositoryError, RepositoryErrorType } from "./error";

export type Client = {
  connectionId: string;
  clientType: string;
  deviceId: string;
};

export const getClientByDeviceId = async (deviceId: string, clientType: string = "device"): Promise<Client> => {
  const output = await dynamodbClient.send(
    new QueryCommand({
      TableName: clientsTable,
      ExpressionAttributeNames: {
        "#FieldName": "DeviceId",
      },
      ExpressionAttributeValues: {
        ":Value": {
          S: deviceId,
        },
      },
      IndexName: deviceIdIndexName,
      KeyConditionExpression: "#FieldName = :Value",
    }),
  );

  if (!output.Count || output.Count < 1) {
    throw new RepositoryError("client not found", RepositoryErrorType.NOT_FOUND);
  }

  const item = output.Items?.find((item) => item["clientType"].S === clientType);

  if (!item) {
    throw new RepositoryError("client not found", RepositoryErrorType.NOT_FOUND);
  }

  return mapItemToClient(item);
};

const mapItemToClient = (item: Record<string, AttributeValue>): Client => {
  return {
    connectionId: item["connectionId"].S as string,
    clientType: item["clientType"].S as string,
    deviceId: item["deviceId"].S as string,
  };
};

export const getClientByConnectionid = async (connectionId: string): Promise<Client> => {
  const output = await dynamodbClient.send(
    new GetItemCommand({
      TableName: clientsTable,
      Key: {
        connectionId: {
          S: connectionId,
        },
      },
    }),
  );

  if (!output.Item) {
    throw new RepositoryError(
      `requesed connection with id of "${connectionId}" does not exist`,
      RepositoryErrorType.NOT_FOUND,
    );
  }

  return mapItemToClient(output.Item);
};

export const getAllClients = async () => {
  const output = await dynamodbClient.send(
    new ScanCommand({
      TableName: clientsTable,
    }),
  );

  if (!output.Count || output.Count < 1) {
    return [];
  }

  const clients = [] as Client[];

  for (const item of output.Items || []) {
    if (item["connectionId"].S && item["clientType"].S) {
      clients.push({
        connectionId: item["connectionId"].S,
        clientType: item["clientType"].S,
        deviceId: item["deviceId"].S || "-",
      });
    }
  }

  return clients;
};
