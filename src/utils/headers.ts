const getHeaders = () => ({
  "content-type": "application/json",
  Date: new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
});

export default getHeaders;
