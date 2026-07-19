export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return startOfDay(result);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function keyToDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isSameDay(firstDate, secondDate) {
  return dateToKey(firstDate) === dateToKey(secondDate);
}

export function getNextBookableDate(baseDate, minimumAdvanceDays = 2) {
  let date = addDays(startOfDay(baseDate), minimumAdvanceDays);

  // Los domingos no se atiende; avanzamos hasta el siguiente lunes.
  while (date.getDay() === 0) {
    date = addDays(date, 1);
  }

  return date;
}

export function buildMonthGrid(visibleMonth) {
  const firstDay = startOfMonth(visibleMonth);
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayBasedOffset);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
