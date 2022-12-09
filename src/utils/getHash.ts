import { createHash } from "crypto";

const getHash = (password: string, salt: string) =>
  createHash("md5")
    .update(password + salt)
    .digest("hex");

export default getHash;
