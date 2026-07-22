import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import "./styles.css";
import "./treatments-cards.css";
import "./responsive-layout.css";
import "./admin.css";

const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {currentPath === "/admin" ? <AdminPanel /> : <App />}
  </StrictMode>,
);
