import { useEffect, useMemo, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

const TOKEN_KEY = "cosmed_admin_token";
const USER_KEY = "cosmed_admin_user";

const dateFormatter = new Intl.DateTimeFormat("es-UY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const stateLabels = {
  disponible: "Disponible",
  pendiente: "Pendiente",
  ocupado: "Ocupado",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateToKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function keyToDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function moveDate(key, amount) {
  const date = keyToDate(key);
  date.setDate(date.getDate() + amount);
  return dateToKey(date);
}

function formatTime(value) {
  return value?.slice(0, 5) ?? "";
}

function formatDate(key) {
  const formatted = dateFormatter.format(keyToDate(key));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatPendingUntil(value) {
  if (!value) return "";
  const time = value.includes("T") ? value.split("T")[1] : value.split(" ")[1];
  return time?.slice(0, 5) ?? "";
}

async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      body?.error?.message || "No se pudo completar la solicitud",
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

function AdminPanel() {
  const today = useMemo(() => dateToKey(new Date()), []);
  const [token, setToken] = useState(
    () => window.sessionStorage.getItem(TOKEN_KEY) || "",
  );
  const [adminName, setAdminName] = useState(
    () => window.sessionStorage.getItem(USER_KEY) || "admin",
  );
  const [credentials, setCredentials] = useState({
    nombreUsuario: "admin",
    password: "",
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [agenda, setAgenda] = useState({
    bloqueada: false,
    bloqueo: null,
    horarios: [],
  });
  const [notes, setNotes] = useState({});
  const [blockReason, setBlockReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const counts = useMemo(
    () =>
      agenda.horarios.reduce(
        (result, schedule) => ({
          ...result,
          [schedule.estado]: result[schedule.estado] + 1,
        }),
        { disponible: 0, pendiente: 0, ocupado: 0 },
      ),
    [agenda.horarios],
  );

  const hasActiveAppointments = counts.pendiente + counts.ocupado > 0;

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    loadAgenda(controller.signal);

    return () => controller.abort();
  }, [token, selectedDate]);

  function closeSession(message = "") {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    setToken("");
    setCredentials((current) => ({ ...current, password: "" }));
    setAgenda({ bloqueada: false, bloqueo: null, horarios: [] });
    setNotice("");
    setError(message);
  }

  function handleRequestError(requestError) {
    if (requestError.status === 401) {
      closeSession("Tu sesión venció. Volvé a iniciar sesión.");
      return;
    }

    setError(
      requestError.message === "Failed to fetch"
        ? "No se pudo conectar con el servidor. Intentá nuevamente."
        : requestError.message,
    );
  }

  async function loadAgenda(signal) {
    setLoading(true);
    setError("");

    try {
      const body = await apiRequest(
        `/api/admin/agenda?fecha=${encodeURIComponent(selectedDate)}`,
        { token, signal },
      );
      const receivedAgenda = body.data;

      setAgenda(receivedAgenda);
      setBlockReason(receivedAgenda.bloqueo?.motivo || "");
      setNotes(
        Object.fromEntries(
          receivedAgenda.horarios.map((schedule) => [
            schedule.horaInicio,
            schedule.notaAdministrativa || "",
          ]),
        ),
      );
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        handleRequestError(requestError);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  async function login(event) {
    event.preventDefault();
    setWorking("login");
    setError("");
    setNotice("");

    try {
      const body = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      const receivedToken = body.data.token;
      const receivedName = body.data.administrador.nombreUsuario;

      window.sessionStorage.setItem(TOKEN_KEY, receivedToken);
      window.sessionStorage.setItem(USER_KEY, receivedName);
      setToken(receivedToken);
      setAdminName(receivedName);
      setCredentials((current) => ({ ...current, password: "" }));
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setWorking("");
    }
  }

  async function runAction({ key, path, method, body }) {
    setWorking(key);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(path, {
        token,
        method,
        body: JSON.stringify(body),
      });
      setNotice(response.message);
      await loadAgenda();
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setWorking("");
    }
  }

  function occupy(schedule) {
    const writtenNote = notes[schedule.horaInicio]?.trim();
    const defaultNote =
      schedule.estado === "pendiente"
        ? "Confirmado por WhatsApp"
        : "Ocupado desde administración";

    runAction({
      key: `occupy-${schedule.horaInicio}`,
      path: "/api/admin/turnos/ocupar",
      method: "PATCH",
      body: {
        fecha: selectedDate,
        hora: schedule.horaInicio,
        nota: writtenNote || defaultNote,
      },
    });
  }

  function release(schedule) {
    const confirmed = window.confirm(
      `¿Querés liberar el horario de las ${formatTime(schedule.horaInicio)}?`,
    );

    if (!confirmed) return;

    runAction({
      key: `release-${schedule.horaInicio}`,
      path: "/api/admin/turnos/liberar",
      method: "POST",
      body: { fecha: selectedDate, hora: schedule.horaInicio },
    });
  }

  function blockDate() {
    if (hasActiveAppointments) {
      setError(
        "Antes de bloquear el día, liberá los horarios pendientes u ocupados.",
      );
      return;
    }

    runAction({
      key: "block-date",
      path: "/api/admin/fechas/bloquear",
      method: "POST",
      body: { fecha: selectedDate, motivo: blockReason.trim() },
    });
  }

  function unblockDate() {
    runAction({
      key: "unblock-date",
      path: "/api/admin/fechas/desbloquear",
      method: "POST",
      body: { fecha: selectedDate },
    });
  }

  if (!token) {
    return (
      <main className="admin-login-page">
        <a className="admin-back-link" href="/">
          ← Volver al sitio
        </a>

        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <div className="admin-brand-mark" aria-hidden="true">C</div>
          <p className="admin-eyebrow">Área privada</p>
          <h1 id="admin-login-title">Administración COSMED</h1>
          <p>Ingresá para gestionar los horarios de la agenda.</p>

          <form onSubmit={login}>
            <label>
              Usuario
              <input
                type="text"
                autoComplete="username"
                value={credentials.nombreUsuario}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    nombreUsuario: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>

            {error && <p className="admin-alert is-error" role="alert">{error}</p>}

            <button className="admin-primary-button" type="submit" disabled={working === "login"}>
              {working === "login" ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/">
          <span className="admin-brand-mark" aria-hidden="true">C</span>
          <span>COSMED · Administración</span>
        </a>

        <div className="admin-session">
          <span>Sesión: <strong>{adminName}</strong></span>
          <button type="button" onClick={() => closeSession()}>Cerrar sesión</button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-title-row">
          <div>
            <p className="admin-eyebrow">Panel de agenda</p>
            <h1>Gestioná tus horarios.</h1>
            <p>Confirmá consultas, ocupá espacios o liberá turnos desde acá.</p>
          </div>

          <button
            className="admin-refresh-button"
            type="button"
            disabled={loading || Boolean(working)}
            onClick={() => loadAgenda()}
          >
            {loading ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </section>

        <section className="admin-date-card" aria-label="Fecha de la agenda">
          <div className="admin-date-picker">
            <button
              type="button"
              aria-label="Día anterior"
              disabled={selectedDate <= today || Boolean(working)}
              onClick={() => setSelectedDate(moveDate(selectedDate, -1))}
            >
              ←
            </button>
            <label>
              Seleccionar fecha
              <input
                type="date"
                min={today}
                value={selectedDate}
                disabled={Boolean(working)}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label="Día siguiente"
              disabled={Boolean(working)}
              onClick={() => setSelectedDate(moveDate(selectedDate, 1))}
            >
              →
            </button>
          </div>

          <div className="admin-date-summary">
            <span className={agenda.bloqueada ? "is-blocked" : "is-enabled"}>
              {agenda.bloqueada ? "Fecha bloqueada" : "Fecha habilitada"}
            </span>
            <strong>{formatDate(selectedDate)}</strong>
          </div>

          <div className="admin-block-controls">
            {agenda.bloqueada ? (
              <>
                <p>
                  Motivo: <strong>{agenda.bloqueo?.motivo || "Sin motivo indicado"}</strong>
                </p>
                <button
                  className="admin-secondary-button"
                  type="button"
                  disabled={Boolean(working)}
                  onClick={unblockDate}
                >
                  {working === "unblock-date" ? "Habilitando..." : "Habilitar fecha"}
                </button>
              </>
            ) : (
              <>
                <label>
                  Motivo para bloquear el día (opcional)
                  <input
                    type="text"
                    maxLength="255"
                    placeholder="Ej.: Día no laborable"
                    value={blockReason}
                    onChange={(event) => setBlockReason(event.target.value)}
                  />
                </label>
                <button
                  className="admin-danger-button"
                  type="button"
                  disabled={Boolean(working) || hasActiveAppointments}
                  onClick={blockDate}
                >
                  {working === "block-date" ? "Bloqueando..." : "Bloquear fecha"}
                </button>
              </>
            )}
          </div>
        </section>

        {error && <p className="admin-alert is-error" role="alert">{error}</p>}
        {notice && <p className="admin-alert is-success" role="status">{notice}</p>}

        <section className="admin-stat-grid" aria-label="Resumen del día">
          <article><span>Disponibles</span><strong>{counts.disponible}</strong></article>
          <article><span>Pendientes</span><strong>{counts.pendiente}</strong></article>
          <article><span>Ocupados</span><strong>{counts.ocupado}</strong></article>
        </section>

        <section className="admin-agenda-section" aria-labelledby="day-schedules-title">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Agenda diaria</p>
              <h2 id="day-schedules-title">Horarios</h2>
            </div>
            <p>Las modificaciones se reflejan inmediatamente en la agenda pública.</p>
          </div>

          {loading && (
            <div className="admin-empty-state" aria-live="polite">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Consultando la agenda...</p>
            </div>
          )}

          {!loading && agenda.bloqueada && (
            <div className="admin-empty-state">
              <strong>Este día está bloqueado.</strong>
              <p>Habilitá la fecha para volver a administrar sus horarios.</p>
            </div>
          )}

          {!loading && !agenda.bloqueada && agenda.horarios.length === 0 && (
            <div className="admin-empty-state">
              <strong>No hay atención este día.</strong>
              <p>La fecha no forma parte de los horarios habituales.</p>
            </div>
          )}

          {!loading && !agenda.bloqueada && agenda.horarios.length > 0 && (
            <div className="admin-slots-grid">
              {agenda.horarios.map((schedule) => {
                const isWorking = working.endsWith(schedule.horaInicio);

                return (
                  <article
                    className={`admin-slot-card is-${schedule.estado}`}
                    key={schedule.horaInicio}
                  >
                    <div className="admin-slot-heading">
                      <div>
                        <strong>{formatTime(schedule.horaInicio)}</strong>
                        <span>hasta {formatTime(schedule.horaFin)}</span>
                      </div>
                      <span className="admin-state-pill">
                        {stateLabels[schedule.estado]}
                      </span>
                    </div>

                    {schedule.estado === "pendiente" && (
                      <p className="admin-slot-detail">
                        Reserva temporal hasta las {formatPendingUntil(schedule.pendienteHasta)}.
                      </p>
                    )}

                    {schedule.estado === "ocupado" ? (
                      <p className="admin-slot-note">
                        {schedule.notaAdministrativa || "Sin nota administrativa"}
                      </p>
                    ) : (
                      <label className="admin-note-field">
                        Nota
                        <input
                          type="text"
                          maxLength="255"
                          placeholder={
                            schedule.estado === "pendiente"
                              ? "Ej.: Nombre del cliente"
                              : "Ej.: Trámite personal"
                          }
                          value={notes[schedule.horaInicio] || ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [schedule.horaInicio]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    )}

                    <div className="admin-slot-actions">
                      {schedule.estado !== "ocupado" && (
                        <button
                          className="admin-primary-button"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() => occupy(schedule)}
                        >
                          {isWorking && working.startsWith("occupy")
                            ? "Guardando..."
                            : schedule.estado === "pendiente"
                              ? "Confirmar turno"
                              : "Marcar ocupado"}
                        </button>
                      )}

                      {schedule.estado !== "disponible" && (
                        <button
                          className="admin-secondary-button"
                          type="button"
                          disabled={Boolean(working)}
                          onClick={() => release(schedule)}
                        >
                          {isWorking && working.startsWith("release")
                            ? "Liberando..."
                            : "Liberar"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;
