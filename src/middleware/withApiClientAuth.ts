import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { StatusCodes } from "http-status-codes";
import { JwtPayload, verify } from "jsonwebtoken";
import { API_CLIENTS_HMAC_SECRET } from "../secret";
import { ErrorType, HttpError } from "../utils/error";

const withApiClientAuth = (fn: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>) => {
  return (event: APIGatewayProxyEventV2) => {
    const authToken = (event.headers["authorization"] || "").slice(7);
    try {
      const decodedToken = verify(authToken, API_CLIENTS_HMAC_SECRET) as JwtPayload;
      event.headers["x-uid"] = decodedToken["uid"];
    } catch (e) {
      throw new HttpError("invalid credentials", StatusCodes.UNAUTHORIZED, ErrorType.INVALID_CREDENTIALS);
    }

    return fn(event);
  };
};

export default withApiClientAuth;
