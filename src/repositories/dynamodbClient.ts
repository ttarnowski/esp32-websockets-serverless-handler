import { DynamoDB } from "@aws-sdk/client-dynamodb";

export const usersTableName = process.env["USERS_TABLE_NAME"];
export const deviceKeysTable = process.env["DEVICE_KEYS_TABLE_NAME"] || "";
export const clientsTable = process.env["CLIENTS_TABLE_NAME"] || "";
export const apiClientsTable = process.env["API_CLIENTS_TABLE_NAME"] || "";
export const scheduleTable = process.env["EXTERNAL_CONTROL_SCHEDULE_TABLE_NAME"] || "";
export const devicesTable = process.env["DEVICES_TABLE_NAME"] || "";
export const deviceIdIndexName = process.env["DEVICE_ID_INDEX_NAME"] || "";

const dynamodbClient = new DynamoDB({});

export default dynamodbClient;
