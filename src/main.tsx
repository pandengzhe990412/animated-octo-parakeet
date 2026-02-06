import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import Sidepanel from "./sidepanel"

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Sidepanel />
  </StrictMode>
)
