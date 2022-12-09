import { APIGatewayProxyResultV2 } from "aws-lambda";
import getHeaders from "./headers";

export enum ErrorType {
  INVALID_REQUEST_BODY = "invalid_request_body",
  INVALID_PATH_PARAM = "invalid_path_param",
  INVALID_CREDENTIALS = "invalid_credentials",
  CONNECTION_GONE = "device_disconnected",
  NOT_FOUND = "not_found",
}

export class HttpError<T = undefined> extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public type: ErrorType,
    public details: T | undefined = undefined,
  ) {
    super(message);
  }

  toAPIGatewayProxyResultV2(): APIGatewayProxyResultV2 {
    return {
      statusCode: this.statusCode,
      headers: getHeaders(),
      body: JSON.stringify({
        status: "error",
        type: this.type,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      }),
    };
  }
}
