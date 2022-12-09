export type FirmwareUpgradeMessage = {
  action: "msg";
  type: "upgrade";
  body: {
    version: string;
    url: string;
  };
};

export const createFirmwareUpgradeMessage = (version: string, url: string): string =>
  JSON.stringify({
    action: "msg",
    type: "upgrade",
    body: {
      version,
      url,
    },
  } as FirmwareUpgradeMessage);
