import { AttributeValue, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import dynamodbClient, { scheduleTable } from "./dynamodbClient";
import { RepositoryError, RepositoryErrorType } from "./error";

export type TemperatureSlot = {
  time: string;
  temperature: number;
};

export type Schedule = TemperatureSlot[][];

export const putScheduleItem = async (dayIndex: number, slots: TemperatureSlot[]) => {
  const slotTimes = slots.map(({ time }) => time);
  const hasDuplicates = new Set(slotTimes).size !== slotTimes.length;
  if (hasDuplicates) {
    throw new RepositoryError("duplicated slots", RepositoryErrorType.DUPLICATED_CONTENT);
  }

  await dynamodbClient.send(
    new PutItemCommand({
      Item: {
        DayIndex: { N: String(dayIndex) },
        Slots: {
          L: slots.map((slot) => ({
            M: {
              Temperature: { N: String(slot.temperature) },
              Time: { S: slot.time },
            },
          })),
        },
      },
      TableName: scheduleTable,
    }),
  );
};

export const fetchScheduleItem = async (dayIndex: number): Promise<TemperatureSlot[]> => {
  const result = await dynamodbClient.send(
    new GetItemCommand({
      Key: {
        DayIndex: { N: String(dayIndex) },
      },
      TableName: scheduleTable,
    }),
  );

  if (!result.Item) {
    throw new RepositoryError(`schedule item ${dayIndex} not found`, RepositoryErrorType.NOT_FOUND);
  }

  return dynamodbItemToSlots(result.Item);
};

export const fetchSchedule = async (): Promise<Schedule> => {
  const result = await dynamodbClient.send(
    new ScanCommand({
      TableName: scheduleTable,
    }),
  );

  if (!result.Count || !result.Items || result.Count < 1) {
    throw new RepositoryError(`schedule not found`, RepositoryErrorType.NOT_FOUND);
  }

  const dayIndexToSlots = [] as [number, TemperatureSlot[]][];

  result.Items.forEach((item) => {
    if (item["DayIndex"].N) {
      dayIndexToSlots.push([Number(item["DayIndex"].N), dynamodbItemToSlots(item)]);
    }
  });

  return dayIndexToSlots.sort((a, b) => a[0] - b[0]).map((item) => item[1]);
};

const dynamodbItemToSlots = (item: Record<string, AttributeValue>) => {
  const schedule = [] as TemperatureSlot[];

  item["Slots"].L?.forEach((element) => {
    if (element.M && element.M["Temperature"].N && element.M["Time"].S) {
      schedule.push({
        temperature: Number(element.M["Temperature"].N),
        time: element.M["Time"].S,
      });
    }
  });

  return schedule;
};
