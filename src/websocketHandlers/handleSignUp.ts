import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 } from "uuid";
import dynamodbClient, { deviceKeysTable } from "../repositories/dynamodbClient";
import { responseOK } from "../utils/responseOK";
import { sendWSMessage } from "../utils/sendWSMessage";

export const handleSignUp = async (connectionId: string) => {
  const keyId = v4().slice(0, 6);

  await dynamodbClient.send(
    new PutItemCommand({
      TableName: deviceKeysTable,
      Item: {
        KeyId: {
          S: keyId,
        },
        connectionId: {
          S: connectionId,
        },
      },
    }),
  );

  await sendWSMessage(
    connectionId,
    JSON.stringify({
      type: "newSignUp",
      qr: `http://aquastat.online/sign-up?key=${keyId}`,
    }),
  );

  return responseOK;
};
