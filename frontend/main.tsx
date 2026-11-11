import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./components/auth";
import App from "./App";
import { demoImage } from "./lib/api";
import "./styles.css";

document.documentElement.style.setProperty("--neighborhood-image", `url("${demoImage("neighborhood.jpg")}")`);
document.documentElement.style.setProperty("--villa-image", `url("${demoImage("villa.jpg")}")`);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
