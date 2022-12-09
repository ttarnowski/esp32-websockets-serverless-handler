import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createFirmwareUpgradeMessage } from "../messages/FirmwareUpgradeMessage";
import { sendWSMessage } from "../utils/sendWSMessage";

const s3Client = new S3Client({});
const region = process.env["REGION"] || "";
const firmwareBucketName = process.env["FIRMWARE_BUCKET_NAME"] || "";

export const handleFirmwareCheck = async (connectionId: string, body: string) => {
  const parsed = JSON.parse(body) as { currentVersion: string };
  if (typeof parsed.currentVersion !== "string") {
    throw new Error("invalid firmwareCheck message");
  }

  const output = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: firmwareBucketName,
    }),
  );

  const latestItem = (output.Contents || []).reduce(
    (latestItem, currentItem) => {
      const parts = currentItem.Key?.split("/", 2);
      if (parts && parts.length > 1 && parts[0] > latestItem.version) {
        return {
          version: parts[0],
          key: currentItem.Key,
        };
      }
      return latestItem;
    },
    { version: parsed.currentVersion, key: undefined } as { version: string; key?: string },
  );

  if (latestItem && latestItem.version > parsed.currentVersion) {
    await sendWSMessage(
      connectionId,
      createFirmwareUpgradeMessage(
        latestItem.version,
        `https://s3.${region}.amazonaws.com/${firmwareBucketName}/${latestItem.key}`,
      ),
    );
  }

  return {
    statusCode: 200,
    body: "",
  };
};
