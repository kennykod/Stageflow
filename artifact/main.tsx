import { createRoot } from "react-dom/client";
import "../src/app/globals.css";
import "./artifact.css";
import { App } from "./App";

document.documentElement.lang = "sv";
createRoot(document.getElementById("root")!).render(<App />);
