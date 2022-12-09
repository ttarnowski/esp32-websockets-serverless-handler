import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { HttpError } from "./utils/error";
import postSignIn from "./requestHandlers/postSignIn";
import putScheduleWeekday from "./requestHandlers/putScheduleWeekday";
import putSchedule from "./requestHandlers/putSchedule";
import postAuthenticate from "./requestHandlers/postAuthenticate";
import postSignUp from "./requestHandlers/postSignUp";
import getHeaders from "./utils/headers";
import getSchedule from "./requestHandlers/getSchedule";
import getScheduleWeekday from "./requestHandlers/getScheduleWeekday";
import withApiClientAuth from "./middleware/withApiClientAuth";
import getSensorReadings from "./requestHandlers/getSensorReadings";

const endpointToHandler = {
  "POST /api/sign-in": postSignIn,
  "POST /api/sign-up": postSignUp,
  "POST /api/authenticate": postAuthenticate,
  "PUT /api/schedule": withApiClientAuth(putSchedule),
  "PUT /api/schedule/weekday/{day}": withApiClientAuth(putScheduleWeekday),
  "GET /api/schedule": withApiClientAuth(getSchedule),
  "GET /api/schedule/weekday/{day}": withApiClientAuth(getScheduleWeekday),
  "GET /api/sensor-readings": withApiClientAuth(getSensorReadings),
};

export const handle = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log(event);
    const methodAndPath = event.requestContext.routeKey as keyof typeof endpointToHandler;

    if (endpointToHandler[methodAndPath] !== undefined) {
      const response = await endpointToHandler[methodAndPath](event);

      return response;
    }

    return {
      body: JSON.stringify({
        status: "invalid method",
      }),
      headers: getHeaders(),
      statusCode: 405,
    };
  } catch (e) {
    if (e instanceof HttpError) {
      return e.toAPIGatewayProxyResultV2();
    }

    throw e;
  }
};
