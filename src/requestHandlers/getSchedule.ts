import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { RepositoryError, RepositoryErrorType } from "../repositories/error";
import { fetchSchedule } from "../repositories/ExternalControlSchedule";
import { ErrorType, HttpError } from "../utils/error";
import getHeaders from "../utils/headers";

const getSchedule = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const schedule = await fetchSchedule();

    return {
      statusCode: 200,
      headers: getHeaders(),
      body: JSON.stringify({ schedule }),
    };
  } catch (e) {
    if (e instanceof RepositoryError && e.type === RepositoryErrorType.NOT_FOUND) {
      throw new HttpError("schedule not found", StatusCodes.NOT_FOUND, ErrorType.NOT_FOUND);
    }

    throw e;
  }
};

export default getSchedule;
