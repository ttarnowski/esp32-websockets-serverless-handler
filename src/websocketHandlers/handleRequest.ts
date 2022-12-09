import { fetchSchedule } from "../repositories/ExternalControlSchedule";
import getExternalScheduleUpdateJSONMessage from "../utils/getExternalScheduleUpdateJSONMessage";
import { sendWSMessage } from "../utils/sendWSMessage";

export const handleRequest = async (connectionId: string, body: string) => {
  const parsed = JSON.parse(body) as { cmd: string };

  if (parsed.cmd === "fetchExtSch") {
    const schedule = await fetchSchedule();

    await Promise.all(
      schedule.map(async (slots, dayIndex) => {
        await sendWSMessage(connectionId, getExternalScheduleUpdateJSONMessage(dayIndex, slots));
      }),
    );
  }

  return {
    statusCode: 200,
    body: "",
  };
};
