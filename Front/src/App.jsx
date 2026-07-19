import Header from "./components/Header.jsx";
import BookingCalendar from "./components/BookingCalendar.jsx";

const treatments = [
  {
    number: "01",
    title: "Higiene e Hidratación facial",
    description: "Combina limpieza, exfoliación e hidratación para retirar impurezas y células muertas, dejando la piel más suave, fresca y equilibrada.",
  },
  {
    number: "02",
    title: "Microneedling",
    description: "Realiza microperforaciones controladas que favorecen la renovación de la piel y ayudan a mejorar la apariencia de marcas, líneas finas y textura irregular.",
  },
  {
    number: "03",
    title: "Microdermoabrasion ",
    description: "Exfoliación mecánica no invasiva, con punta de diamante, que retira células muertas de la superficie para mejorar la suavidad y la textura de la piel.",
  },
  {
    number: "04",
    title: "Peeling ",
    description: "Exfoliación química controlada que favorece la renovación de la piel y ayuda a mejorar su textura, luminosidad y la apariencia de manchas superficiales.",
  },
  {
    number: "05",
    title: "Mesoterapia facial y corporal",
    description: "Favorece la aplicación localizada de activos seleccionados según la zona para mejorar la hidratación, luminosidad y apariencia general de la piel.",
  },
  {
    number: "06",
    title: "Radiofrecuencia facial y corporal",
    description: "Utiliza energía de radiofrecuencia para generar calor controlado, favoreciendo una apariencia más firme y uniforme en las zonas tratadas.",
  },

];

function App() {
  return (
    <>
      <Header />

      <main>
        <section className="hero section-shell" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">Centro de estética y bienestar</p>
            <h1>Cuidado profesional pensado para vos.</h1>
            <p className="hero-description">
              Una experiencia cercana y personalizada, con una agenda clara para
              consultar tus próximos horarios disponibles.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#agenda">
                Consultar agenda
              </a>
              <a className="text-link" href="#tratamientos">
                Ver tratamientos <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Vista previa decorativa de la agenda">
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />
            <article className="appointment-card">
              <div className="appointment-card-topline">
                <span>Próxima disponibilidad</span>
                <span className="status-dot">Disponible</span>
              </div>
              <strong>Elegí tu momento</strong>
              <p>Consultá el calendario y contactá directamente por WhatsApp.</p>
              {/* <div className="time-pills" aria-hidden="true">
                <span>08:00</span>
                <span>09:00</span>
                <span>10:00</span>
              </div> */}
            </article>
          </div>
        </section>

        <section className="about section-shell" id="sobre-mi">
          <div className="section-heading">
            <p className="eyebrow">Sobre mí</p>
            <h2>Atención cercana, responsable y personalizada.</h2>
          </div>
          <div className="about-copy">
            <p>
              Mi nombre es Delia, soy Tecnóloga en Cosmetología Medica, titulo brindado por Fac. de Medicina - EUTM.
              <br />
              Además soy Lic. en Laboratorio Clínico y Aux. de Enfermeria.
            </p>
            <p className="placeholder-note">
              
            </p>
          </div>
        </section>

        <section className="treatments" id="tratamientos">
          <div className="section-shell">
            <div className="section-heading treatments-heading">
              <div>
                <p className="eyebrow">Tratamientos</p>
                <h2>Opciones de cuidado para distintas necesidades.</h2>
              </div>
              <p>
                Más adelante reemplazaremos estos ejemplos por los tratamientos
                reales y sus descripciones.
              </p>
            </div>

            <div className="treatment-grid">
              {treatments.map((treatment) => (
                <article className="treatment-card" key={treatment.number}>
                  <span>{treatment.number}</span>
                  <h3>{treatment.title}</h3>
                  <p>{treatment.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="agenda section-shell" id="agenda">
          <div className="agenda-copy">
            <p className="eyebrow">Agenda</p>
            <h2>Encontrá un horario disponible.</h2>
            <p>
              Elegí una fecha y consultá los horarios en tiempo real. Cada turno
              dura 60 minutos y puede solicitarse con al menos dos días de
              anticipación.
            </p>
            <dl className="opening-hours">
              <div>
                <dt>Lunes a viernes</dt>
                <dd>08:00 — 11:00</dd>
              </div>
              <div>
                <dt>Sábados</dt>
                <dd>09:00 — 16:00</dd>
              </div>
            </dl>
          </div>

          <BookingCalendar />
        </section>
      </main>

      <footer>
        <div className="section-shell footer-inner">
          <span>Centro estético</span>
          <a href="#inicio">Volver arriba ↑</a>
        </div>
      </footer>
    </>
  );
}

export default App;
