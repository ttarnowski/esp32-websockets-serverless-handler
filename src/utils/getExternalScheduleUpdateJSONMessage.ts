import { TemperatureSlot } from "../repositories/ExternalControlSchedule";

const getExternalScheduleUpdateJSONMessage = (dayIndex: number, slots: TemperatureSlot[]) => {
  return JSON.stringify({
    action: "msg",
    type: "extSchUpdate",
    day: dayIndex,
    slots: slots.map((slot) => {
      const timeElements = slot.time.split(":");

      return {
        hh: Number(timeElements[0]),
        mm: Number(timeElements[1]),
        temp: slot.temperature,
      };
    }),
  });
};

export default getExternalScheduleUpdateJSONMessage;
