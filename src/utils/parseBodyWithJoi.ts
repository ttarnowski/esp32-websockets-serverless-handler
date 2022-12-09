import { StatusCodes } from "http-status-codes";
import Joi, { ValidationError, ValidationErrorItem } from "joi";
import { ErrorType, HttpError } from "./error";

const parseBodyWithJoi = async <T>(body: string | undefined, schema: Joi.AnySchema<T>) => {
  try {
    const parsed = JSON.parse(body || "");
    return await schema.validateAsync(parsed, { abortEarly: false });
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new HttpError(
        "request body format must be in JSON format",
        StatusCodes.BAD_REQUEST,
        ErrorType.INVALID_REQUEST_BODY,
      );
    }

    const err = e as ValidationError;
    if (!err.isJoi) {
      throw e;
    }

    throw new HttpError<ValidationErrorItem[]>(
      err.message,
      StatusCodes.UNPROCESSABLE_ENTITY,
      ErrorType.INVALID_REQUEST_BODY,
      err.details,
    );
  }
};

export default parseBodyWithJoi;
