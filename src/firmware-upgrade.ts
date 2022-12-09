import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { S3Event } from "aws-lambda";
import { createFirmwareUpgradeMessage } from "./messages/FirmwareUpgradeMessage";
import { sendWSMessage } from "./utils/sendWSMessage";

const dynamodbClient = new DynamoDBClient({});
const clientsTable = process.env["CLIENTS_TABLE_NAME"] || "";

export const execute = async (event: S3Event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const region = event.Records[0].awsRegion;
  const path = event.Records[0].s3.object.key;
  const parts = path.split("/", 2);
  if (parts.length < 2) {
    console.warn("no binary uploaded");
    return;
  }
  const version = parts[0];

  const output = await dynamodbClient.send(new ScanCommand({ TableName: clientsTable }));

  if (!output.Count || output.Count < 1) {
    console.log("no devices connected");
    return;
  }

  for (const item of output.Items || []) {
    console.log(`upgrading device ${item["deviceId"].S} ${`https://s3.${region}.amazonaws.com/${bucketName}/${path}`}`);

    await sendWSMessage(
      item["connectionId"].S as string,
      createFirmwareUpgradeMessage(version, `https://s3.${region}.amazonaws.com/${bucketName}/${path}`),
    );
  }
};
