const APPLICATION_TIME_ZONE = "Asia/Manila";

export function formatApplicationDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values["year"]}-${values["month"]}-${values["day"]}`;
}

export function getApplicationTodayDate() {
  return formatApplicationDate(new Date());
}

export function isDateOnOrAfterApplicationToday(date: Date) {
  return formatApplicationDate(date) >= getApplicationTodayDate();
}

export function isDateStringOnOrAfterApplicationToday(date: string) {
  return date >= getApplicationTodayDate();
}
