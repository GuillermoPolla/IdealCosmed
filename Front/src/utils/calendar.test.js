import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthGrid,
  dateToKey,
  getNextBookableDate,
} from "./calendar.js";

test("dateToKey devuelve una fecha local en formato AAAA-MM-DD", () => {
  assert.equal(dateToKey(new Date(2026, 6, 5)), "2026-07-05");
});

test("la primera fecha reservable evita los domingos", () => {
  const friday = new Date(2026, 6, 17, 12);

  assert.equal(dateToKey(getNextBookableDate(friday, 2)), "2026-07-20");
});

test("el calendario genera seis semanas comenzando un lunes", () => {
  const days = buildMonthGrid(new Date(2026, 6, 1));

  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(dateToKey(days[0]), "2026-06-29");
});
