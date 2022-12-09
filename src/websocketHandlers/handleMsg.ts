import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { fetchByDeviceId, updateDevice } from "../repositories/Devices";
import dynamodbClient, { clientsTable } from "../repositories/dynamodbClient";
import { RepositoryError, RepositoryErrorType } from "../repositories/error";
import { Client, getClientByConnectionid } from "../repositories/WSClients";
import { responseOK } from "../utils/responseOK";
import { sendWSMessage } from "../utils/sendWSMessage";

const captureData = async (thisClient: Client, body: string) => {
  if (thisClient.clientType !== "device" || thisClient.deviceId === "-") {
    return;
  }

  try {
    const data = JSON.parse(body) as { action: string; type: string } | Record<string, unknown>;
    if (data.action !== "msg") {
      return;
    }

    if (data.type === "sensorReadings") {
      const msg = data as { body: Record<string, unknown> };
      const device = await fetchByDeviceId(thisClient.deviceId);
      device.sensorReadings = msg.body;
      await updateDevice(device);
    }

    if (data.type === "modeChange") {
      const msg = data as { mode: number };
      const device = await fetchByDeviceId(thisClient.deviceId);
      device.mode = msg.mode;
      await updateDevice(device);
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error("could not capture device message, invalid body format", body);
      return;
    }

    if (e instanceof RepositoryError && e.type === RepositoryErrorType.NOT_FOUND) {
      console.warn("could not find device to store capture data", e);
    }

    console.error(e);
  }
};

export const handleMsg = async (thisConnectionId: string, body: string): Promise<APIGatewayProxyResult> => {
  // TODO: check if device exists otherwise send reset message

  const thisClient = await getClientByConnectionid(thisConnectionId);
  const thisConnectionClientType = thisClient.clientType;
  const thisConnectionDeviceId = thisClient.deviceId;

  await captureData(thisClient, body);

  const output = await dynamodbClient.send(
    new ScanCommand({
      TableName: clientsTable,
    }),
  );

  if (output.Count && output.Count > 0) {
    for (const item of output.Items || []) {
      if (
        item["connectionId"].S !== thisConnectionId &&
        item["clientType"].S !== thisConnectionClientType &&
        item["deviceId"].S === thisConnectionDeviceId
      ) {
        await sendWSMessage(item["connectionId"].S as string, body);
      }
    }
  } else {
    await sendWSMessage(thisConnectionId, JSON.stringify({ action: "msg", type: "warning", body: "no recipient" }));
  }

  return responseOK;
};
