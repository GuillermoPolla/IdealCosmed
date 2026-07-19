import { useEffect, useState } from "react";

const navigation = [
  { label: "Sobre mí", href: "#sobre-mi" },
  { label: "Tratamientos", href: "#tratamientos" },
  { label: "Agenda", href: "#agenda" },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("resize", closeMenu);

    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a
          className="brand-link"
          href="#inicio"
          aria-label="Volver al inicio"
          onClick={closeMenu}
        >
          <span className="brand-symbol" aria-hidden="true">
            C
          </span>
          <span className="brand-placeholder">IDEAL COSMED</span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-navigation"
          className={`primary-navigation ${menuOpen ? "is-open" : ""}`}
          aria-label="Navegación principal"
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Header;
