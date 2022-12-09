import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { fetchAllDevices } from "../repositories/Devices";
import getHeaders from "../utils/headers";

const getSensorReadings = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const devices = await fetchAllDevices();

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify(
      devices
        .filter((device) => device.sensorReadings !== undefined && device.mode === 3)
        .map((device) => ({
          deviceId: device.deviceId,
          sensorReadings: device.sensorReadings,
        })),
    ),
  };
};

export default getSensorReadings;
