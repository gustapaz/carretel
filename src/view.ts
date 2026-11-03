import p5 from "p5";
import type { State } from "./model.ts";
export class View {
  p: p5;
  ready = false;
  drawing = false;
  constructor(
    private host: HTMLElement,
    private state: () => State,
    private intent: () => number,
    private progress: () => number,
    private reduced: () => boolean,
    private frame: (dt: number) => void,
    private loaded: () => void,
    private failed: () => void,
  ) {
    this.p = new p5((p) => {
      p.setup = () => {
        try {
          p.pixelDensity(Math.min(devicePixelRatio || 1, 2));
          const canvas = p.createCanvas(640, 640);
          canvas.elt.setAttribute("aria-hidden", "true");
          p.frameRate(30);
          p.noLoop();
          this.ready = true;
          this.loaded();
        } catch {
          p.noLoop();
          this.failed();
        }
      };
      p.draw = () => {
        this.drawing = true;
        this.frame(p.deltaTime / 1000);
        this.draw(p.drawingContext as CanvasRenderingContext2D);
        this.drawing = false;
      };
    }, host);
  }
  run(active: boolean) {
    if (!this.ready) return;
    if (active) this.p.loop();
    else {
      this.p.noLoop();
      this.request();
    }
  }
  request() {
    if (this.ready && !this.drawing && !this.p.isLooping())
      void this.p.redraw();
  }
  dispose() {
    this.p.remove();
  }
  private draw(c: CanvasRenderingContext2D) {
    const s = this.state();
    c.clearRect(0, 0, 640, 640);
    c.save();
    c.translate(320, 320);
    const radii = [126, 192, 258];
    const xy = (lane: number, sector: number) => {
      const a = (sector * Math.PI) / 6 - Math.PI / 2;
      return { x: Math.cos(a) * radii[lane], y: Math.sin(a) * radii[lane] };
    };
    c.fillStyle = "#f3ead6";
    c.beginPath();
    c.arc(0, 0, 312, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#bbad92";
    c.lineWidth = 1;
    for (let lane = 0; lane < 3; lane++)
      for (let sec = 0; sec < 12; sec++) {
        const a = (sec * Math.PI) / 6 - Math.PI / 2;
        const r = radii[lane];
        c.beginPath();
        c.arc(0, 0, r - 29, a - 0.239, a + 0.239);
        c.arc(0, 0, r + 29, a + 0.239, a - 0.239, true);
        c.closePath();
        c.fillStyle = lane === 1 ? "#e8d3c4" : "#e8dfcb";
        c.fill();
        c.stroke();
      }
    c.font = "11px Courier New";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#5c3541";
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 - Math.PI / 2;
      c.fillText(
        String(i + 1).padStart(2, "0"),
        Math.cos(a) * 300,
        Math.sin(a) * 300,
      );
    }
    for (const k of s.knots) {
      const { x, y } = xy(k.lane, k.sector);
      c.save();
      c.translate(x, y);
      c.strokeStyle = "#672338";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-10, -10);
      c.lineTo(10, 10);
      c.moveTo(10, -10);
      c.lineTo(-10, 10);
      c.stroke();
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 19, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    const f = xy(s.food.lane, s.food.sector);
    c.save();
    c.translate(f.x, f.y);
    c.rotate((s.food.sector * Math.PI) / 6);
    c.fillStyle = "#fff9ec";
    c.strokeStyle = "#672338";
    c.lineWidth = 2;
    c.fillRect(-12, -15, 24, 30);
    c.strokeRect(-12, -15, 24, 30);
    c.fillStyle = "#672338";
    c.fillRect(-16, -16, 32, 5);
    c.fillRect(-16, 11, 32, 5);
    c.beginPath();
    c.arc(0, 0, 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
    const positions = s.body.map((b) => xy(b.lane, b.sector)).reverse();
    for (const [color, width] of [
      ["#fff9ec", 29],
      ["#386aca", 21],
    ] as const) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      positions.forEach((p, i) =>
        i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
      );
      c.stroke();
    }
    const h = xy(s.body[0].lane, s.body[0].sector);
    c.fillStyle = "#284e9b";
    c.beginPath();
    c.arc(h.x, h.y, 17, 0, Math.PI * 2);
    c.fill();
    const angle = (s.body[0].sector * Math.PI) / 6;
    c.fillStyle = "#fff9ec";
    c.beginPath();
    c.arc(
      h.x + Math.cos(angle) * 7,
      h.y + Math.sin(angle) * 7,
      5,
      0,
      Math.PI * 2,
    );
    c.fill();
    const n = xy(
      Math.max(0, Math.min(2, s.body[0].lane + this.intent())),
      (s.body[0].sector + 1) % 12,
    );
    c.save();
    c.strokeStyle = "#386aca";
    c.lineWidth = 2;
    c.setLineDash([3, 4]);
    c.beginPath();
    c.arc(n.x, n.y, 23, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    c.fillStyle = "#672338";
    c.font = "52px Georgia";
    c.fillText(`${s.collected}/8`, 0, -6);
    c.font = "9px Courier New";
    c.fillText("CARRETÉIS", 0, 30);
    c.font = "9px Courier New";
    c.fillText(`${180 - s.ticks} PULSOS DE FIO`, 0, 48);
    c.strokeStyle = "#672338";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(
      0,
      0,
      80,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (this.reduced() ? 0 : this.progress()),
    );
    c.stroke();
    c.restore();
  }
}
