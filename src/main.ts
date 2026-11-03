import {
  create,
  step,
  Clock,
  modes,
  patterns,
  score,
  readSave,
  record,
  type State,
  type Mode,
  type Weave,
} from "./model.ts";
import { View } from "./view.ts";
import "./style.css";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const modeSelect = $<HTMLSelectElement>("#mode"),
  weaveSelect = $<HTMLSelectElement>("#weave"),
  arena = $("#arena"),
  dialog = $<HTMLDialogElement>("#dialog");
let save = readSave(null);
try {
  save = readSave(localStorage.getItem("carretel.save.v1"));
} catch {}
let state: State = create(0),
  mode: Mode = "treino",
  phase: "ready" | "playing" | "won" | "lost" = "ready",
  intent = 0,
  recorded = false,
  ready = false,
  view: View,
  opener: HTMLElement | null = null,
  audio: AudioContext | null = null,
  voices = 0;
const clock = new Clock();
let skipFrame = true;
function persist() {
  try {
    localStorage.setItem("carretel.save.v1", JSON.stringify(save));
  } catch {}
}
function sound(win = false) {
  if (!save.sound || voices >= 4) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.frequency.value = win ? 523 : 174;
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    o.connect(g).connect(audio.destination);
    voices++;
    o.onended = () => {
      voices--;
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(audio.currentTime + 0.13);
  } catch {}
}
const position = (c: { lane: number; sector: number }) =>
  `pista ${c.lane + 1}, setor ${c.sector + 1}`;
function render() {
  const active = phase === "playing";
  $("#menu").hidden = phase === "ready";
  $("#phase").textContent = dialog.open
    ? "PAUSA"
    : {
        ready: "PRONTO PARA ENROLAR",
        playing: "O FIO ESTÁ CORRENDO",
        won: "TRAMA CONCLUÍDA",
        lost: "DEU NÓ",
      }[phase];
  $("#lane").textContent = String(state.body[0].lane + 1);
  $("#sector").textContent = String(state.body[0].sector + 1).padStart(2, "0");
  $("#ticks").textContent = String(state.ticks);
  $("#score").textContent = String(score(state));
  $("#queued").textContent =
    `PRÓXIMA: ${intent < 0 ? "DENTRO" : intent > 0 ? "FORA" : "MANTER"}`;
  for (const id of ["inner", "hold", "outer", "pause"])
    $<HTMLButtonElement>("#" + id).disabled = !active || !ready;
  $<HTMLButtonElement>("#start").disabled = !ready;
  $("#start").textContent =
    phase === "ready" ? "Soltar o fio ↗" : "Recomeçar rodada ↗";
  modeSelect.disabled = active;
  weaveSelect.disabled = active;
  $("#result").hidden = phase !== "won" && phase !== "lost";
  $("#result-title").textContent =
    phase === "won" ? "De ponta a ponta." : "Todo fio merece outra chance.";
  $("#result-detail").textContent =
    `${state.reason} ${state.collected}/8 carretéis · ${state.ticks} pulsos · ${score(state)} pontos.`;
  const r =
    save.records[
      state.weave * 3 + ["treino", "cadencia", "giro"].indexOf(mode)
    ];
  $("#record").textContent =
    `${patterns[state.weave].name} / ${modes[mode].label}: ${r.played} ${r.played === 1 ? "rodada" : "rodadas"} · ${r.wins} ${r.wins === 1 ? "vitória" : "vitórias"} · recorde ${r.best}`;
  $("#map").textContent =
    `Cabeça: ${position(state.body[0])}. Carretel: ${position(state.food)}. Nós: ${state.knots.map(position).join("; ")}. Fita, da cabeça à ponta: ${state.body.map(position).join("; ")}.`;
  $("#sound").textContent = save.sound ? "Som ligado" : "Som desligado";
  $("#sound").setAttribute("aria-pressed", String(save.sound));
  $("#motion").setAttribute("aria-pressed", String(save.motion));
  document.body.classList.toggle("reduced", save.motion);
  view?.run(active && modes[mode].period > 0 && !dialog.open);
}
function start() {
  if (!ready) return;
  state = create(Number(weaveSelect.value) as Weave);
  mode = modeSelect.value as Mode;
  phase = "playing";
  intent = 0;
  recorded = false;
  clock.reset();
  skipFrame = true;
  $("#message").textContent =
    mode === "treino"
      ? "Treino: cada comando avança um pulso. Pense no próximo setor."
      : "O fio avança sozinho. Cada comando prepara apenas o próximo pulso.";
  render();
  arena.focus({ preventScroll: true });
  arena.scrollIntoView({
    block: matchMedia("(max-width:600px)").matches ? "start" : "center",
    behavior: "instant",
  });
}
function advance(change: number) {
  if (phase !== "playing" || dialog.open) return;
  const before = state.collected;
  state = step(state, change);
  intent = 0;
  if (state.status !== "playing") {
    phase = state.status;
    clock.reset();
    skipFrame = true;
    if (!recorded) {
      recorded = true;
      save = record(save, state, mode);
      persist();
    }
    $("#message").textContent = state.reason;
    sound(state.status === "won");
  } else if (state.collected > before) {
    $("#message").textContent =
      `${state.collected} de 8 recolhidos. Novo carretel na ${position(state.food)}.`;
    sound();
  }
  render();
}
function choose(change: number) {
  if (phase !== "playing" || dialog.open) return;
  if (mode === "treino") advance(change);
  else {
    intent = change;
    $("#message").textContent =
      `Preparado: ${change < 0 ? "pista interna" : change > 0 ? "pista externa" : "manter pista"}. Vale só no próximo pulso.`;
    render();
  }
  arena.focus({ preventScroll: true });
  if (matchMedia("(max-width:600px)").matches)
    arena.scrollIntoView({ block: "start", behavior: "instant" });
}
function open(help = false) {
  if (dialog.open) return;
  opener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  intent = 0;
  clock.reset();
  skipFrame = true;
  $("#dialog-title").textContent = help
    ? "O fio só sabe seguir em frente."
    : "Uma pausa entre os pontos.";
  const body = $("#dialog-body");
  body.replaceChildren();
  const text = help
    ? [
        "Três pistas, doze setores. A fita sempre avança no sentido horário. Recolha oito carretéis sem tocar em nós (X) ou no próprio corpo. Cada coleta alonga a fita.",
        "Esquerda, cima ou A: mudar para dentro. Direita, baixo ou D: mudar para fora. Espaço/Enter: manter. Comandos só funcionam com a arena focada; botões também aceitam clique/toque.",
        "Treino: cada comando avança uma casa. Cadência: 650 ms por pulso. Giro: 400 ms. Nos dois ritmos contínuos você prepara apenas o próximo pulso; a intenção volta a manter depois dele. A mudança fica restrita à pista vizinha.",
        "A pista 1 é interna e a 3 é externa. Os setores seguem o relógio. Um círculo tracejado indica a próxima casa. O mapa em texto mostra cabeça, carretel, nós e corpo.",
        "A ponta da cauda pode sair no mesmo pulso em que você entra naquela casa, exceto quando cresce. Há 180 pulsos de fio. Pontos: 100 por coleta e, na vitória, duas vezes os pulsos que faltam para 200.",
        "Escape/P pausa; perda de foco também pausa. Recomeçar abandona a rodada sem registrá-la. Recordes são locais e separados nas nove combinações. A rodada em andamento não é salva.",
      ]
    : [
        "O fio está parado. Retome quando estiver pronto; a próxima intenção será manter pista.",
      ];
  for (const line of text) {
    const p = document.createElement("p");
    p.textContent = line;
    body.append(p);
  }
  dialog.showModal();
  render();
}
function close() {
  dialog.close();
  clock.reset();
  skipFrame = true;
  intent = 0;
  render();
  if (phase === "playing") arena.focus({ preventScroll: true });
  else opener?.focus();
}
$("#start").addEventListener("click", start);
$("#again").addEventListener("click", start);
$("#inner").addEventListener("click", () => choose(-1));
$("#outer").addEventListener("click", () => choose(1));
$("#hold").addEventListener("click", () => choose(0));
$("#pause").addEventListener("click", () => open());
$("#help").addEventListener("click", () => open(true));
$("#resume").addEventListener("click", close);
$("#menu").addEventListener("click", () => {
  dialog.close();
  phase = "ready";
  state = create(state.weave);
  intent = 0;
  clock.reset();
  skipFrame = true;
  $("#message").textContent =
    "Rodada encerrada sem registro. Escolha outra trama ou ritmo.";
  render();
  weaveSelect.focus();
});
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
for (const el of [modeSelect, weaveSelect])
  el.addEventListener("change", () => {
    if (phase === "playing") return;
    mode = modeSelect.value as Mode;
    state = create(Number(weaveSelect.value) as Weave);
    phase = "ready";
    intent = 0;
    clock.reset();
    skipFrame = true;
    $("#message").textContent = "Trama pronta. Solte o fio para começar.";
    render();
  });
arena.addEventListener("keydown", (e) => {
  if (e.repeat || dialog.open) return;
  const key = e.key.toLowerCase();
  if (
    [
      "arrowleft",
      "arrowup",
      "a",
      "arrowright",
      "arrowdown",
      "d",
      " ",
      "enter",
    ].includes(key)
  ) {
    e.preventDefault();
    choose(
      ["arrowleft", "arrowup", "a"].includes(key)
        ? -1
        : ["arrowright", "arrowdown", "d"].includes(key)
          ? 1
          : 0,
    );
  } else if ((key === "escape" || key === "p") && phase === "playing") {
    e.preventDefault();
    open();
  }
});
$("#sound").addEventListener("click", () => {
  save = { ...save, sound: !save.sound };
  persist();
  render();
  sound();
});
$("#motion").addEventListener("click", () => {
  save = { ...save, motion: !save.motion };
  persist();
  render();
});
const blur = () => {
  if (phase === "playing") open();
};
window.addEventListener("blur", blur);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) blur();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) blur();
});
window.addEventListener("pagehide", (e) => {
  if (!e.persisted) {
    view?.dispose();
    void audio?.close();
  }
});
try {
  view = new View(
    $("#canvas"),
    () => state,
    () => intent,
    () => (modes[mode].period ? clock.acc / modes[mode].period : 0),
    () => save.motion || matchMedia("(prefers-reduced-motion: reduce)").matches,
    (dt) => {
      if (phase !== "playing" || dialog.open || !modes[mode].period) return;
      if (skipFrame) {
        skipFrame = false;
        clock.reset();
        return;
      }
      clock.advance(dt, modes[mode].period, () => {
        advance(intent);
        return phase === "playing";
      });
    },
    () => {
      ready = true;
      $("#loading").hidden = true;
      queueMicrotask(render);
    },
    () => {
      ready = false;
      $("#error").hidden = false;
      $("#loading").hidden = true;
      render();
    },
  );
} catch {
  $("#error").hidden = false;
  $("#loading").hidden = true;
}
render();
