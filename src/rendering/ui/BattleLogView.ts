const MAX_ENTRIES = 300;

export enum BattleLogEntryKind {
  Move,
  PlayerAttack,
  EnemyAttack
}

const ENTRY_KIND_CLASS: Record<BattleLogEntryKind, string> = {
  [BattleLogEntryKind.Move]: "battle-log__entry--move",
  [BattleLogEntryKind.PlayerAttack]: "battle-log__entry--player-attack",
  [BattleLogEntryKind.EnemyAttack]: "battle-log__entry--enemy-attack"
};

/** Fixed screen-space, scrollable, copyable battle log docked to the bottom-left of the screen. */
export class BattleLogView {
  readonly element: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly lines: string[] = [];

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "battle-log";

    const toolbar = document.createElement("div");
    toolbar.className = "battle-log__toolbar";

    const copyButton = document.createElement("button");
    copyButton.className = "battle-log__copy-button";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => void this.copyToClipboard());
    toolbar.appendChild(copyButton);

    this.bodyEl = document.createElement("div");
    this.bodyEl.className = "battle-log__body";

    this.element.append(toolbar, this.bodyEl);
  }

  /** Appends one log line: `detail` (if given) renders smaller/muted right after `main`. */
  log(main: string, detail?: string, kind: BattleLogEntryKind = BattleLogEntryKind.Move): void {
    const entry = document.createElement("div");
    entry.className = `battle-log__entry ${ENTRY_KIND_CLASS[kind]}`;

    const mainEl = document.createElement("span");
    mainEl.className = "battle-log__main";
    mainEl.textContent = main;
    entry.appendChild(mainEl);

    if (detail) {
      const detailEl = document.createElement("span");
      detailEl.className = "battle-log__detail";
      detailEl.textContent = ` ${detail}`;
      entry.appendChild(detailEl);
    }

    this.bodyEl.appendChild(entry);
    this.lines.push(detail ? `${main} ${detail}` : main);

    if (this.lines.length > MAX_ENTRIES) {
      this.bodyEl.removeChild(this.bodyEl.firstChild!);
      this.lines.shift();
    }

    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.lines.join("\n"));
    } catch {
      // Clipboard API can be unavailable (insecure context, denied permission) — nothing to do.
    }
  }
}
