import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { putScheduleItem, TemperatureSlot } from "../repositories/ExternalControlSchedule";
import parseBodyWithJoi from "../utils/parseBodyWithJoi";
import Joi from "joi";
import { ErrorType, HttpError } from "../utils/error";
import { StatusCodes } from "http-status-codes";
import getHeaders from "../utils/headers";
import { RepositoryError, RepositoryErrorType } from "../repositories/error";
import { getAllClients } from "../repositories/WSClients";
import getExternalScheduleUpdateJSONMessage from "../utils/getExternalScheduleUpdateJSONMessage";
import { sendWSMessage } from "../utils/sendWSMessage";

const array = () => Joi.array();
const object = <T>(schema?: Joi.PartialSchemaMap<T> | undefined) => Joi.object<T>(schema);
const number = () => Joi.number();
const string = () => Joi.string();

type PutScheduleWeekdayRequestBody = {
  slots: TemperatureSlot[];
};

export const temperatureSlotsSchema = array().items(
  object({
    temperature: number().min(80).max(180).required(),
    time: string()
      .regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
      .required()
      .messages({ "string.pattern.base": "time must match HH:MM format" }),
  }),
);

const putScheduleWeekdayRequestBodySchema = object<PutScheduleWeekdayRequestBody>({
  slots: temperatureSlotsSchema.required(),
});

const putScheduleWeekday = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const index = event.pathParameters ? event.pathParameters["day"] : "";

  if (!index || Number(index) === NaN) {
    throw new HttpError("invalid weekday index", StatusCodes.BAD_REQUEST, ErrorType.INVALID_PATH_PARAM);
  }

  const reqBody = await parseBodyWithJoi(event.body, putScheduleWeekdayRequestBodySchema);
  const dayIndex = Number(index);

  try {
    await putScheduleItem(dayIndex, reqBody.slots);

    const clients = await getAllClients();

    await Promise.all(
      clients.map(async (client) => {
        if (client.clientType !== "device") {
          return;
        }

        await sendWSMessage(client.connectionId, getExternalScheduleUpdateJSONMessage(dayIndex, reqBody.slots));
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

export default putScheduleWeekday;
