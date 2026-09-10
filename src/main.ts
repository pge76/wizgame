import "@rendering/ui/party-bar.css";
import "@rendering/ui/battle-hud.css";
import "@rendering/ui/battle-action-bar.css";
import "@rendering/ui/battle-log.css";
import "@rendering/ui/character-sheet.css";
import { Game } from "@core/Game";

const mountEl = document.getElementById("app");
if (!mountEl) {
  throw new Error('Mount element "#app" not found.');
}

const game = new Game();
void game.start(mountEl);
