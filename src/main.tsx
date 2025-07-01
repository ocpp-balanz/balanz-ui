import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import BalanzAPI from "./services/balanz_api";

console.log("UI version: ", import.meta.env.PACKAGE_VERSION);
const api_url: string =
  import.meta.env.VITE_BALANZ_URL ?? "ws://localhost:9999/api";
console.log("Setting balanz URL to", api_url);
const api = new BalanzAPI(api_url);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Router>
    <App api={api} />
  </Router>,
);
