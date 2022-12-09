import { AttributeValue, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import dynamodbClient, { devicesTable } from "./dynamodbClient";
import { RepositoryError, RepositoryErrorType } from "./error";

export type Device = {
  deviceId: string;
  deviceKey: string;
  mode: number;
  sensorReadings?: Record<string, unknown>;
};

export const fetchAllDevices = async (): Promise<Device[]> => {
  const output = await dynamodbClient.send(
    new ScanCommand({
      TableName: devicesTable,
    }),
  );

  if (!output.Items || !output.Count || output.Count < 1) {
    return [];
  }

  return output.Items.map((item) => mapItemToDevice(item));
};

export const fetchByDeviceId = async (deviceId: string): Promise<Device> => {
  const output = await dynamodbClient.send(
    new GetItemCommand({
      TableName: devicesTable,
      Key: {
        DeviceId: {
          S: deviceId,
        },
      },
    }),
  );

  if (!output.Item) {
    throw new RepositoryError(
      `requested device with id of "${deviceId}" does not exist`,
      RepositoryErrorType.NOT_FOUND,
    );
  }

  return mapItemToDevice(output.Item);
};

const mapItemToDevice = (item: Record<string, AttributeValue>): Device => {
  const sensorReadings = {} as Record<string, unknown>;

  if (item["SensorReadings"] && item["SensorReadings"].M) {
    const mapValue = item["SensorReadings"].M;
    Object.keys(mapValue).forEach((key) => {
      if (mapValue[key].BOOL) {
        sensorReadings[key] = mapValue[key].BOOL;
      }
      if (mapValue[key].N) {
        sensorReadings[key] = Number(mapValue[key].N);
      }
      if (mapValue[key].S) {
        sensorReadings[key] = String(mapValue[key].S);
      }
    });
  }

  return {
    deviceId: item["DeviceId"].S as string,
    deviceKey: item["DeviceKey"].S as string,
    mode: Number(item["Mode"] && item["Mode"].N ? item["Mode"].N : "0"),
    sensorReadings,
  };
};

export const updateDevice = async (device: Device) => {
  if (!(await doesDeviceExist(device.deviceId))) {
    throw new RepositoryError("device does not exist", RepositoryErrorType.NOT_FOUND);
  }

  return upsertDevice(device);
};

export const createDevice = async (device: Device) => {
  if (await doesDeviceExist(device.deviceId)) {
    throw new RepositoryError("device with this id already exist", RepositoryErrorType.DUPLICATED_CONTENT);
  }

  return upsertDevice(device);
};

const doesDeviceExist = async (deviceId: string): Promise<boolean> => {
  try {
    await fetchByDeviceId(deviceId);
    return true;
  } catch (e) {
    if (e instanceof RepositoryError && e.type === RepositoryErrorType.NOT_FOUND) {
      return false;
    }
    throw e;
  }
};

const upsertDevice = async (device: Device) => {
  const sensorReadings = device.sensorReadings
    ? Object.keys(device.sensorReadings).reduce((prev, key) => {
        const readings = device.sensorReadings as Record<string, unknown>;

        switch (typeof readings[key]) {
          case "number":
            return { ...prev, [key]: { N: String(readings[key]) } };
          case "string":
            return { ...prev, [key]: { S: String(readings[key]) } };
          case "boolean":
            return { ...prev, [key]: { BOOL: Boolean(readings[key]) } };
        }

        return prev;
      }, {} as Record<string, AttributeValue>)
    : {};

  await dynamodbClient.send(
    new PutItemCommand({
      Item: {
        DeviceId: { S: device.deviceId },
        DeviceKey: { S: device.deviceKey },
        Mode: { N: String(device.mode) },
        SensorReadings: { M: sensorReadings },
      },
      TableName: devicesTable,
    }),
  );
};
