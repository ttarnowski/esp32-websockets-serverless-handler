import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { RepositoryError, RepositoryErrorType } from "../repositories/error";
import { fetchSchedule, fetchScheduleItem } from "../repositories/ExternalControlSchedule";
import { ErrorType, HttpError } from "../utils/error";
import getHeaders from "../utils/headers";

const getScheduleWeekday = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const index = event.pathParameters ? event.pathParameters["day"] : "";

    if (!index || Number(index) === NaN) {
      throw new HttpError("invalid weekday index", StatusCodes.BAD_REQUEST, ErrorType.INVALID_PATH_PARAM);
    }

    const slots = await fetchScheduleItem(Number(index));

    return {
      statusCode: 200,
      headers: getHeaders(),
      body: JSON.stringify({
        weekday: Number(index),
        slots,
      }),
    };
  } catch (e) {
    if (e instanceof RepositoryError && e.type === RepositoryErrorType.NOT_FOUND) {
      throw new HttpError("schedule not found", StatusCodes.NOT_FOUND, ErrorType.NOT_FOUND);
    }

    throw e;
  }
};

export default getScheduleWeekday;
