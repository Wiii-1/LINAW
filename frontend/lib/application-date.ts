const APPLICATION_TIME_ZONE = "Asia/Manila";

export function getApplicationTodayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values["year"]}-${values["month"]}-${values["day"]}`;
}
