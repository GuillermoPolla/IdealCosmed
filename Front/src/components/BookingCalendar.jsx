import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  dateToKey,
  endOfMonth,
  getNextBookableDate,
  isSameDay,
  keyToDate,
  startOfMonth,
} from "../utils/calendar.js";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(
  /\D/g,
  "",
);

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthFormatter = new Intl.DateTimeFormat("es-UY", {
  month: "long",
  year: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("es-UY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(value) {
  return value?.slice(0, 5) ?? "";
}

async function getResponseError(response) {
  try {
    const body = await response.json();
    return body.error?.message || "No se pudo completar la solicitud";
  } catch {
    return "No se pudo completar la solicitud";
  }
}

function BookingCalendar() {
  const minimumDate = useMemo(() => getNextBookableDate(new Date(), 2), []);
  const maximumMonth = useMemo(
    () => addMonths(startOfMonth(minimumDate), 6),
    [minimumDate],
  );
  const maximumDate = useMemo(() => endOfMonth(maximumMonth), [maximumMonth]);

  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(minimumDate));
  const [selectedDate, setSelectedDate] = useState(minimumDate);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [dayStates, setDayStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedDateKey = dateToKey(selectedDate);
  const calendarDays = useMemo(
    () => buildMonthGrid(visibleMonth),
    [visibleMonth],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchedules() {
      setLoading(true);
      setError("");
      setNotice("");
      setSelectedSchedule(null);

      try {
        const response = await fetch(
          `${API_URL}/api/agenda/horarios?fecha=${selectedDateKey}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const body = await response.json();
        const receivedSchedules = body.data?.horarios ?? [];
        const hasAvailableSchedules = receivedSchedules.some(
          (schedule) => schedule.estado === "disponible",
        );

        setSchedules(receivedSchedules);
        setDayStates((current) => ({
          ...current,
          [selectedDateKey]:
            receivedSchedules.length === 0
              ? "closed"
              : hasAvailableSchedules
                ? "available"
                : "full",
        }));
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSchedules([]);
          setError(
            requestError.message === "Failed to fetch"
              ? "No se pudo conectar con la agenda. Verificá que el backend esté iniciado."
              : requestError.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSchedules();

    return () => controller.abort();
  }, [selectedDateKey]);

  const canGoToPreviousMonth =
    visibleMonth.getTime() > startOfMonth(minimumDate).getTime();
  const canGoToNextMonth = visibleMonth.getTime() < maximumMonth.getTime();

  function changeMonth(amount) {
    const nextMonth = addMonths(visibleMonth, amount);
    let nextSelectedDate = startOfMonth(nextMonth);

    if (nextSelectedDate < minimumDate) {
      nextSelectedDate = minimumDate;
    }

    while (nextSelectedDate.getDay() === 0) {
      nextSelectedDate = addDays(nextSelectedDate, 1);
    }

    setVisibleMonth(nextMonth);
    setSelectedDate(nextSelectedDate);
  }

  function selectDate(date) {
    setSelectedDate(date);
    setError("");
    setNotice("");
  }

  async function continueToWhatsApp() {
    if (!selectedSchedule || booking) {
      return;
    }

    if (WHATSAPP_NUMBER.length < 8) {
      setError(
        "Falta configurar el número de WhatsApp en el archivo .env del frontend.",
      );
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");

    if (whatsappWindow) {
      whatsappWindow.opener = null;
      whatsappWindow.document.title = "Abriendo WhatsApp";
      whatsappWindow.document.body.textContent = "Reservando el horario...";
    }

    setBooking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/agenda/reservas-temporales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: selectedDateKey,
          hora: selectedSchedule.horaInicio,
        }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const body = await response.json();
      const reservedTime = selectedSchedule.horaInicio;
      const stillHasAvailableSchedules = schedules.some(
        (schedule) =>
          schedule.horaInicio !== reservedTime && schedule.estado === "disponible",
      );

      setSchedules((current) =>
        current.map((schedule) =>
          schedule.horaInicio === reservedTime
            ? { ...schedule, estado: "pendiente" }
            : schedule,
        ),
      );
      setDayStates((current) => ({
        ...current,
        [selectedDateKey]: stillHasAvailableSchedules ? "available" : "full",
      }));
      setSelectedSchedule(null);
      setNotice(body.message);

     const formattedDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
}).format(keyToDate(selectedDateKey));

const message =
  `Hola, quisiera consultar por un turno el ${formattedDate} ` +
  `a las ${formatTime(reservedTime)}. Gracias.`;

const whatsappUrl =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      if (whatsappWindow) {
        whatsappWindow.location.replace(whatsappUrl);
      } else {
        window.location.assign(whatsappUrl);
      }
    } catch (requestError) {
      whatsappWindow?.close();
      setError(
        requestError.message === "Failed to fetch"
          ? "No se pudo conectar con la agenda. Intentá nuevamente."
          : requestError.message,
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="booking-widget">
      <div className="booking-widget-topbar">
        <span>Agenda online</span>
        <span className="online-status">
          <i aria-hidden="true" /> Horarios actualizados
        </span>
      </div>

      <div className="booking-content">
        <div className="calendar-panel">
          <div className="month-navigation">
            <button
              type="button"
              aria-label="Ver mes anterior"
              disabled={!canGoToPreviousMonth}
              onClick={() => changeMonth(-1)}
            >
              ←
            </button>
            <strong>{capitalize(monthFormatter.format(visibleMonth))}</strong>
            <button
              type="button"
              aria-label="Ver mes siguiente"
              disabled={!canGoToNextMonth}
              onClick={() => changeMonth(1)}
            >
              →
            </button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid" aria-label="Seleccionar una fecha">
            {calendarDays.map((date) => {
              const dateKey = dateToKey(date);
              const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const selectable =
                !outsideMonth &&
                date >= minimumDate &&
                date <= maximumDate &&
                date.getDay() !== 0;
              const selected = isSameDay(date, selectedDate);
              const dayState = dayStates[dateKey];

              return (
                <button
                  className={[
                    "calendar-day",
                    outsideMonth ? "is-outside" : "",
                    selected ? "is-selected" : "",
                    dayState ? `is-${dayState}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={dateKey}
                  type="button"
                  disabled={!selectable}
                  aria-label={fullDateFormatter.format(date)}
                  aria-pressed={selected}
                  onClick={() => selectDate(date)}
                >
                  <span>{date.getDate()}</span>
                  {dayState && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="legend-available" /> Con horarios</span>
            <span><i className="legend-full" /> Sin horarios libres</span>
          </div>
        </div>

        <div className="schedules-panel">
          <p className="selected-date-label">Fecha seleccionada</p>
          <h3>{capitalize(fullDateFormatter.format(selectedDate))}</h3>

          {loading && (
            <div className="schedule-message" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Consultando horarios...</p>
            </div>
          )}

          {!loading && schedules.length > 0 && (
            <div className="schedule-grid">
              {schedules.map((schedule) => {
                const available = schedule.estado === "disponible";
                const selected =
                  selectedSchedule?.horaInicio === schedule.horaInicio;

                return (
                  <button
                    className={[
                      "schedule-button",
                      `is-${schedule.estado}`,
                      selected ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={schedule.horaInicio}
                    type="button"
                    disabled={!available || booking}
                    aria-pressed={selected}
                    onClick={() => setSelectedSchedule(schedule)}
                  >
                    <strong>{formatTime(schedule.horaInicio)}</strong>
                    <span>
                      {available
                        ? "Disponible"
                        : schedule.estado === "pendiente"
                          ? "Pendiente"
                          : "Ocupado"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && schedules.length === 0 && !error && (
            <div className="schedule-message">
              <span aria-hidden="true">—</span>
              <p>La profesional no atiende en esta fecha.</p>
            </div>
          )}

          {error && (
            <p className="booking-alert is-error" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="booking-alert is-success" role="status">
              {notice}
            </p>
          )}

          <div className="booking-action">
            {selectedSchedule ? (
              <p>
                Elegiste <strong>{formatTime(selectedSchedule.horaInicio)}</strong>
              </p>
            ) : (
              <p>Seleccioná un horario disponible para continuar.</p>
            )}

            <button
              className="whatsapp-button"
              type="button"
              disabled={!selectedSchedule || booking}
              onClick={continueToWhatsApp}
            >
              {booking ? "Reservando..." : "Continuar por WhatsApp"}
            </button>
            <small>
              Al continuar, el horario quedará pendiente durante 30 minutos.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingCalendar;
