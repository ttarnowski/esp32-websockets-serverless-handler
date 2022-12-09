import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { putScheduleItem, TemperatureSlot } from "../repositories/ExternalControlSchedule";
import parseBodyWithJoi from "../utils/parseBodyWithJoi";
import { temperatureSlotsSchema } from "./putScheduleWeekday";
import Joi from "joi";
import getHeaders from "../utils/headers";
import { RepositoryError, RepositoryErrorType } from "../repositories/error";
import { ErrorType, HttpError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import { getAllClients } from "../repositories/WSClients";
import getExternalScheduleUpdateJSONMessage from "../utils/getExternalScheduleUpdateJSONMessage";
import { sendWSMessage } from "../utils/sendWSMessage";

const array = () => Joi.array();
const object = <T>(schema?: Joi.PartialSchemaMap<T> | undefined) => Joi.object<T>(schema);

type PutScheduleRequestBody = {
  schedule: TemperatureSlot[][];
};

const putScheduleRequestBodySchema = object<PutScheduleRequestBody>({
  schedule: array().items(temperatureSlotsSchema).max(7),
});

const putSchedule = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const reqBody = await parseBodyWithJoi(event.body, putScheduleRequestBodySchema);

  try {
    await Promise.all(
      reqBody.schedule.map(async (slots, dayIndex) => {
        await putScheduleItem(dayIndex, slots);
      }),
    );

    const clients = await getAllClients();

    await Promise.all(
      clients.map(async (client) => {
        await Promise.all(
          reqBody.schedule.map(async (slots, dayIndex) => {
            if (client.clientType !== "device") {
              return;
            }

            await sendWSMessage(client.connectionId, getExternalScheduleUpdateJSONMessage(dayIndex, slots));
          }),
        );
      }),
    );

    return {
      statusCode: 200,
      headers: getHeaders(),
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (e) {
    if (e instanceof RepositoryError && e.type === RepositoryErrorType.DUPLICATED_CONTENT) {
      throw new HttpError(e.message, StatusCodes.UNPROCESSABLE_ENTITY, ErrorType.INVALID_REQUEST_BODY);
    }

    throw e;
  }
};

export default putSchedule;
