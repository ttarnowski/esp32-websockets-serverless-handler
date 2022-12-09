export enum RepositoryErrorType {
  NOT_FOUND = "not_found",
  DUPLICATED_CONTENT = "duplicated_content",
}

export class RepositoryError extends Error {
  constructor(public message: string, public type: RepositoryErrorType) {
    super(message);
  }
}
