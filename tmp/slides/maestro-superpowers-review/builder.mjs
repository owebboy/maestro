import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/popeoliv/Developer/skills/maestro";
const OUT_DIR = path.join(ROOT, "outputs", "maestro-superpowers-review");
const SCRATCH_DIR = path.join(ROOT, "tmp", "slides", "maestro-superpowers-review");
const PPTX_PATH = path.join(OUT_DIR, "maestro-superpowers-review.pptx");

const W = 1280;
const H = 720;

const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  panelAlt: "#172033",
  text: "#F8FAFC",
  muted: "#94A3B8",
  maestro: "#0F766E",
  maestroLight: "#14B8A6",
  superpowers: "#F59E0B",
  superpowersLight: "#FBBF24",
  red: "#EF4444",
  green: "#22C55E",
  line: "#243041",
  white: "#FFFFFF",
};

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

function asBuffer(value) {
  if (value?.data instanceof Uint8Array) {
    return Buffer.from(value.data);
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }
  if (typeof value?.arrayBuffer === "function") {
    return value.arrayBuffer().then((buf) => Buffer.from(buf));
  }
  throw new Error(`Unsupported binary export type: ${typeof value}`);
}

presentation.theme.colorScheme = {
  name: "MaestroSuperpowersReview",
  themeColors: {
    accent1: COLORS.maestro,
    accent2: COLORS.superpowers,
    bg1: COLORS.bg,
    bg2: COLORS.panel,
    tx1: COLORS.text,
    tx2: COLORS.muted,
  },
};

const titleStyle = presentation.styles.add("deckTitle");
titleStyle.fontSize = 34;
titleStyle.bold = true;
titleStyle.color = COLORS.text;
titleStyle.typeface = "Poppins";

const h1Style = presentation.styles.add("h1");
h1Style.fontSize = 28;
h1Style.bold = true;
h1Style.color = COLORS.text;
h1Style.typeface = "Poppins";

const h2Style = presentation.styles.add("h2");
h2Style.fontSize = 18;
h2Style.bold = true;
h2Style.color = COLORS.text;
h2Style.typeface = "Poppins";

const bodyStyle = presentation.styles.add("body");
bodyStyle.fontSize = 18;
bodyStyle.color = COLORS.text;
bodyStyle.typeface = "Lato";

const smallStyle = presentation.styles.add("small");
smallStyle.fontSize = 15;
smallStyle.color = COLORS.muted;
smallStyle.typeface = "Lato";

function addBg(slide) {
  slide.background.fill = COLORS.bg;
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: H },
    fill: {
      color: COLORS.bg,
    },
    line: { width: 0, fill: COLORS.bg },
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: 10 },
    fill: {
      color: COLORS.maestro,
    },
    line: { width: 0, fill: COLORS.maestro },
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 920, top: 0, width: 360, height: 10 },
    fill: {
      color: COLORS.superpowers,
    },
    line: { width: 0, fill: COLORS.superpowers },
  });
}

function addTitle(slide, eyebrow, title, subtitle) {
  const eye = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 64, top: 48, width: 210, height: 34 },
    fill: COLORS.panelAlt,
    line: { width: 1, fill: COLORS.line },
  });
  eye.text = eyebrow;
  eye.text.style = "small";
  eye.text.color = COLORS.maestroLight;
  eye.text.bold = true;
  eye.text.alignment = "center";
  eye.text.verticalAlignment = "middle";

  const t = slide.shapes.add({
    geometry: "rect",
    position: { left: 64, top: 104, width: 1150, height: 60 },
    fill: { color: COLORS.bg, transparency: 100000 },
    line: { width: 0, fill: COLORS.bg },
  });
  t.text = title;
  t.text.style = "deckTitle";

  if (subtitle) {
    const s = slide.shapes.add({
      geometry: "rect",
      position: { left: 64, top: 170, width: 1080, height: 70 },
      fill: { color: COLORS.bg, transparency: 100000 },
      line: { width: 0, fill: COLORS.bg },
    });
    s.text = subtitle;
    s.text.style = "body";
    s.text.color = COLORS.muted;
  }
}

function addCard(slide, { left, top, width, height, title, accent, bodyLines }) {
  const card = slide.shapes.add({
    geometry: "roundRect",
    position: { left, top, width, height },
    fill: COLORS.panel,
    line: { width: 1, fill: COLORS.line },
  });

  const bar = slide.shapes.add({
    geometry: "roundRect",
    position: { left: left + 20, top: top + 18, width: 64, height: 10 },
    fill: accent,
    line: { width: 0, fill: accent },
  });
  bar.text = "";

  const head = slide.shapes.add({
    geometry: "rect",
    position: { left: left + 20, top: top + 40, width: width - 40, height: 28 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  head.text = title;
  head.text.style = "h2";

  const text = slide.shapes.add({
    geometry: "rect",
    position: { left: left + 20, top: top + 82, width: width - 40, height: height - 100 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  text.text = bodyLines.join("\n");
  text.text.style = "body";
  text.text.fontSize = 17;
}

function addBulletList(slide, left, top, width, items, color = COLORS.text) {
  const box = slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height: items.length * 40 + 12 },
    fill: { color: COLORS.bg, transparency: 100000 },
    line: { width: 0, fill: COLORS.bg },
  });
  box.text = items.map((item) => `• ${item}`).join("\n");
  box.text.style = "body";
  box.text.fontSize = 20;
  box.text.color = color;
}

function addFooter(slide, leftText, rightText) {
  const l = slide.shapes.add({
    geometry: "rect",
    position: { left: 64, top: 682, width: 700, height: 20 },
    fill: { color: COLORS.bg, transparency: 100000 },
    line: { width: 0, fill: COLORS.bg },
  });
  l.text = leftText;
  l.text.style = "small";

  const r = slide.shapes.add({
    geometry: "rect",
    position: { left: 930, top: 682, width: 286, height: 20 },
    fill: { color: COLORS.bg, transparency: 100000 },
    line: { width: 0, fill: COLORS.bg },
  });
  r.text = rightText;
  r.text.style = "small";
  r.text.alignment = "right";
}

function makeSlide1() {
  const slide = presentation.slides.add();
  addBg(slide);

  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 64, top: 84, width: 1152, height: 560 },
    fill: COLORS.panel,
    line: { width: 1, fill: COLORS.line },
  });

  const label = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 92, top: 116, width: 264, height: 38 },
    fill: COLORS.panelAlt,
    line: { width: 1, fill: COLORS.line },
  });
  label.text = "Engineering Review Deck";
  label.text.style = "small";
  label.text.color = COLORS.superpowersLight;
  label.text.bold = true;
  label.text.alignment = "center";
  label.text.verticalAlignment = "middle";

  const title = slide.shapes.add({
    geometry: "rect",
    position: { left: 92, top: 184, width: 820, height: 160 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  title.text = "Maestro + Superpowers\nWhat They Solve, Where They Fit, and What Needs Attention";
  title.text.style = "deckTitle";
  title.text.fontSize = 36;

  const subtitle = slide.shapes.add({
    geometry: "rect",
    position: { left: 92, top: 372, width: 720, height: 120 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  subtitle.text = "Review date: April 21, 2026\nAudience: fellow coders evaluating agent workflow tooling\nTakeaway: Maestro is the coordinator; Superpowers is the execution engine.";
  subtitle.text.style = "body";
  subtitle.text.color = COLORS.muted;

  addCard(slide, {
    left: 834,
    top: 184,
    width: 340,
    height: 148,
    title: "Maestro",
    accent: COLORS.maestro,
    bodyLines: ["Track lifecycle", "Issue pipeline", "UAT and reviews"],
  });

  addCard(slide, {
    left: 834,
    top: 352,
    width: 340,
    height: 148,
    title: "Superpowers",
    accent: COLORS.superpowers,
    bodyLines: ["Brainstorming", "Planning", "TDD and subagent loops"],
  });

  addCard(slide, {
    left: 92,
    top: 528,
    width: 1082,
    height: 84,
    title: "Bottom line",
    accent: COLORS.superpowers,
    bodyLines: ["Together they form a strong development system, but Codex support still has a few sharp edges that matter in real use."],
  });

  addFooter(slide, "Maestro review based on local repo inspection and smoke tests", "Superpowers reviewed at obra/superpowers v5.0.7");
}

function makeSlide2() {
  const slide = presentation.slides.add();
  addBg(slide);
  addTitle(slide, "System Model", "These projects operate at different layers of the workflow", "The easiest way to understand them is not feature-by-feature, but by control plane versus execution plane.");

  addCard(slide, {
    left: 64,
    top: 260,
    width: 510,
    height: 310,
    title: "Maestro: control plane",
    accent: COLORS.maestro,
    bodyLines: [
      "Creates project context and tracks",
      "Moves work from inbox to reviewed issue to implementation track",
      "Maintains status, metadata, UAT, archival, and session cleanup",
      "Wraps optional skills behind a single developer workflow",
    ],
  });

  addCard(slide, {
    left: 706,
    top: 260,
    width: 510,
    height: 310,
    title: "Superpowers: execution plane",
    accent: COLORS.superpowers,
    bodyLines: [
      "Pushes brainstorming before coding",
      "Turns approved design into explicit implementation plans",
      "Enforces TDD, review loops, and branch finishing discipline",
      "Optimizes for autonomous throughput once the plan is right",
    ],
  });

  const connector = slide.shapes.add({
    geometry: "rightArrow",
    position: { left: 590, top: 375, width: 90, height: 74 },
    fill: COLORS.superpowers,
    line: { width: 0, fill: COLORS.superpowers },
  });
  connector.text = "";

  const note = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 470, top: 602, width: 344, height: 54 },
    fill: COLORS.panelAlt,
    line: { width: 1, fill: COLORS.line },
  });
  note.text = "Best mental model: Maestro decides what work exists. Superpowers decides how the work gets done.";
  note.text.style = "small";
  note.text.alignment = "center";
  note.text.verticalAlignment = "middle";

  addFooter(slide, "This separation is the strongest architectural idea across both projects.", "Slide 2");
}

function makeSlide3() {
  const slide = presentation.slides.add();
  addBg(slide);
  addTitle(slide, "Coverage Snapshot", "What the review actually covered", "The review focused on the surfaces that control developer behavior, installation, and cross-harness compatibility.");

  const chartPanel = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 64, top: 248, width: 576, height: 370 },
    fill: COLORS.panel,
    line: { width: 1, fill: COLORS.line },
  });
  chartPanel.text = "";

  const chart = slide.charts.add("bar");
  chart.position = { left: 92, top: 290, width: 520, height: 280 };
  chart.title = "Review Surface Count";
  chart.titleTextStyle.fontSize = 20;
  chart.titleTextStyle.fill = COLORS.text;
  chart.titleTextStyle.typeface = "Poppins";
  chart.categories = ["Maestro", "Superpowers"];
  chart.hasLegend = true;
  chart.legend.position = "bottom";
  chart.legend.textStyle.fontSize = 14;
  chart.legend.textStyle.fill = COLORS.muted;
  chart.legend.textStyle.typeface = "Lato";
  chart.barOptions.direction = "column";
  chart.barOptions.grouping = "clustered";
  chart.yAxis.textStyle.fontSize = 14;
  chart.yAxis.textStyle.fill = COLORS.muted;
  chart.yAxis.textStyle.typeface = "Lato";
  chart.xAxis.textStyle.fontSize = 16;
  chart.xAxis.textStyle.fill = COLORS.text;
  chart.xAxis.textStyle.typeface = "Lato";
  chart.plotAreaFill = COLORS.panel;

  const s1 = chart.series.add("Skills");
  s1.values = [15, 12];
  s1.categories = chart.categories;
  s1.fill = COLORS.maestro;

  const s2 = chart.series.add("Install/packaging surfaces");
  s2.values = [6, 5];
  s2.categories = chart.categories;
  s2.fill = COLORS.superpowers;

  const s3 = chart.series.add("Tests / harness checks");
  s3.values = [5, 6];
  s3.categories = chart.categories;
  s3.fill = COLORS.superpowersLight;

  addCard(slide, {
    left: 672,
    top: 248,
    width: 544,
    height: 172,
    title: "Maestro review method",
    accent: COLORS.maestro,
    bodyLines: [
      "Local repo inspection",
      "Manifest validation",
      "Installer smoke tests",
      "Skill and hook path analysis",
    ],
  });

  addCard(slide, {
    left: 672,
    top: 446,
    width: 544,
    height: 172,
    title: "Superpowers review method",
    accent: COLORS.superpowers,
    bodyLines: [
      "Canonical GitHub source review",
      "Codex install/doc path analysis",
      "Skill-to-runtime assumption checks",
      "Release and issue cross-checking",
    ],
  });

  addFooter(slide, "This was a behavioral workflow review, not just a README skim.", "Slide 3");
}

function makeSlide4() {
  const slide = presentation.slides.add();
  addBg(slide);
  addTitle(slide, "Maestro", "Strong structure, a few real Codex gaps", "The repo is internally coherent and the installer works, but the Codex-specific edges need tightening.");

  addCard(slide, {
    left: 64,
    top: 244,
    width: 380,
    height: 336,
    title: "What is strong",
    accent: COLORS.green,
    bodyLines: [
      "Plugin manifests and docs are aligned",
      "Local validation passes cleanly",
      "Installer smoke tests succeeded for Claude and Codex targets",
      "Shared skill catalog is clear and well-scoped",
    ],
  });

  addCard(slide, {
    left: 470,
    top: 244,
    width: 356,
    height: 336,
    title: "Verified finding #1",
    accent: COLORS.red,
    bodyLines: [
      "The session-start hook counts template example bullets as real inbox items.",
      "Fresh installs incorrectly show 2 unprocessed issues before any work exists.",
      "This is a real UX bug, not just a doc mismatch.",
    ],
  });

  addCard(slide, {
    left: 852,
    top: 244,
    width: 364,
    height: 336,
    title: "Verified findings #2 and #3",
    accent: COLORS.superpowers,
    bodyLines: [
      "Optional-skill detection is Claude-centric and misses project-scoped Codex installs in .agents/skills.",
      "A few 'do not invoke implicitly' controls still rely on frontmatter that Maestro's own Codex docs say Codex ignores.",
    ],
  });

  addFooter(slide, "Best summary: operationally solid, but Codex integration still trails the repo’s own ambitions.", "Slide 4");
}

function makeSlide5() {
  const slide = presentation.slides.add();
  addBg(slide);
  addTitle(slide, "Superpowers", "Excellent workflow discipline, one notable Codex-native mismatch", "The core methodology is strong. The current gap is the distance between Codex install docs and one of the runtime review workflows.");

  addCard(slide, {
    left: 64,
    top: 252,
    width: 402,
    height: 320,
    title: "What is strong",
    accent: COLORS.green,
    bodyLines: [
      "Clear methodology: brainstorm, plan, TDD, review, finish",
      "Cross-harness packaging exists for several environments",
      "Contributor guidance is unusually explicit about quality",
      "Release process is active and recent",
    ],
  });

  addCard(slide, {
    left: 492,
    top: 252,
    width: 344,
    height: 320,
    title: "Verified finding",
    accent: COLORS.red,
    bodyLines: [
      "Codex-native install exposes skills, but requesting-code-review still instructs users to dispatch a Task-style code-reviewer subagent.",
      "That reviewer template lives outside the native Codex skill install path.",
      "Result: the flow can degrade exactly where review should be mandatory.",
    ],
  });

  addCard(slide, {
    left: 862,
    top: 252,
    width: 354,
    height: 320,
    title: "Residual risk",
    accent: COLORS.superpowers,
    bodyLines: [
      "Visible test folders cover triggering and other harnesses, but no Codex-focused tests were obvious in the repo surface.",
      "That makes Codex regressions easier to ship.",
    ],
  });

  addFooter(slide, "Best summary: impressive system design, but Codex support needs tighter end-to-end verification.", "Slide 5");
}

function makeSlide6() {
  const slide = presentation.slides.add();
  addBg(slide);
  addTitle(slide, "Adoption Guidance", "How I’d pitch this to an engineering team", "Treat these as complementary pieces of a workflow stack, not competitors.");

  addCard(slide, {
    left: 64,
    top: 248,
    width: 360,
    height: 300,
    title: "Adopt Maestro when",
    accent: COLORS.maestro,
    bodyLines: [
      "You want tracked work, issue routing, and session continuity.",
      "Your team needs operational scaffolding more than philosophy.",
      "You work across Claude and Codex and want one house workflow.",
    ],
  });

  addCard(slide, {
    left: 460,
    top: 248,
    width: 360,
    height: 300,
    title: "Adopt Superpowers when",
    accent: COLORS.superpowers,
    bodyLines: [
      "You want stricter engineering discipline inside each implementation step.",
      "Your team benefits from forced planning, TDD, and review loops.",
      "You are comfortable buying into a stronger opinionated workflow.",
    ],
  });

  addCard(slide, {
    left: 856,
    top: 248,
    width: 360,
    height: 300,
    title: "Best combined setup",
    accent: COLORS.superpowersLight,
    bodyLines: [
      "Use Maestro as the shell around project workflow.",
      "Use Superpowers as the engine behind design, planning, and execution.",
      "Patch the Codex gaps before rolling it out broadly.",
    ],
  });

  addFooter(slide, "This combination makes sense because the projects are layered, not redundant.", "Slide 6");
}

function makeSlide7() {
  const slide = presentation.slides.add();
  addBg(slide);

  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 64, top: 92, width: 1152, height: 536 },
    fill: COLORS.panel,
    line: { width: 1, fill: COLORS.line },
  });

  const title = slide.shapes.add({
    geometry: "rect",
    position: { left: 104, top: 156, width: 1040, height: 80 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  title.text = "Recommendation";
  title.text.style = "deckTitle";

  const body = slide.shapes.add({
    geometry: "rect",
    position: { left: 104, top: 258, width: 980, height: 220 },
    fill: { color: COLORS.panel, transparency: 100000 },
    line: { width: 0, fill: COLORS.panel },
  });
  body.text = "Maestro is the better operational wrapper.\nSuperpowers is the better behavioral engine.\nIf you want a serious coding-agent workflow, use both.\nIf you want to trust Codex broadly, fix the review-path and detection gaps first.";
  body.text.style = "h1";
  body.text.fontSize = 30;

  const tag1 = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 104, top: 526, width: 240, height: 44 },
    fill: COLORS.maestro,
    line: { width: 0, fill: COLORS.maestro },
  });
  tag1.text = "Maestro = coordination";
  tag1.text.style = "small";
  tag1.text.color = COLORS.white;
  tag1.text.bold = true;
  tag1.text.alignment = "center";
  tag1.text.verticalAlignment = "middle";

  const tag2 = slide.shapes.add({
    geometry: "roundRect",
    position: { left: 370, top: 526, width: 264, height: 44 },
    fill: COLORS.superpowers,
    line: { width: 0, fill: COLORS.superpowers },
  });
  tag2.text = "Superpowers = execution";
  tag2.text.style = "small";
  tag2.text.color = COLORS.white;
  tag2.text.bold = true;
  tag2.text.alignment = "center";
  tag2.text.verticalAlignment = "middle";

  addFooter(slide, "Deck created from local Maestro review and canonical Superpowers source review.", "Slide 7");
}

makeSlide1();
makeSlide2();
makeSlide3();
makeSlide4();
makeSlide5();
makeSlide6();
makeSlide7();

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(SCRATCH_DIR, { recursive: true });

for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  const pngBuffer = await asBuffer(png);
  await fs.writeFile(path.join(SCRATCH_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`), pngBuffer);
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(PPTX_PATH);

console.log(PPTX_PATH);
