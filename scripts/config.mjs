/**
 * Every piece of personal content lives here. Edit this file, run `npm run
 * build`, and README.md plus every SVG under assets/ is regenerated.
 *
 * Nothing else in scripts/ should need touching to change what the profile says.
 */

const GH = "SinghAbhinav04";
const PAGES = `https://singhabhinav04.github.io/${GH}`;

export const CONFIG = {
  /* ------------------------------------------------------------- identity */
  github: GH,
  pages: PAGES,
  name: "Abhinav Singh",
  role: "Software Engineer · Full Stack + Applied AI",
  location: "Pune, India",
  email: "heysinghabhinav@gmail.com",
  // Masked on purpose: the full number is in resume.pdf for anyone who wants it,
  // but it should not sit in plain text where scrapers can lift it.
  phone: "+91 8146 XXXXXX",
  linkedin: "singhabhinav04",
  discord: "https://discord.gg/ygYnFbre",

  /* ------------------------------------------------------- about-this-mac */
  tagline:
    "Builds production, cloud-native systems on Azure with Java/Spring Boot and React — and applied-AI systems in Python.",
  specs: [
    ["Role", "Software Engineer @ Bajaj Finserv Health"],
    ["Education", "B.Tech Computer Science · 2023–2027"],
    ["Institution", "Chitkara University, Baddi"],
    ["Focus", "Backend architecture · Event-driven systems"],
    ["Applied AI", "LLM integration · RAG · Agentic memory"],
  ],

  /* ---------------------------------------------------------- experience */
  experience: [
    {
      company: "Bajaj Finserv Health",
      short: "BFHL",
      role: "Software Engineer",
      period: "2025 — Present",
      place: "Pune, India",
      tint: "#0a84ff",
      bullets: [
        "Built an automated mailer system in Java/Spring Boot that processes issuance and endorsement data from MongoDB into consolidated failure reports, notifying external partners directly.",
        "Designed MonitorHub, an observability subsystem over issuance, SSO and communications pipelines — pluggable collectors, scheduled snapshots, deviation reports and two-hourly failure alerts.",
        "Implemented a Salesforce circuit breaker with DLQ replay for policy issuance, adding resilient retry and recovery to a Kafka-driven event flow.",
      ],
      stack: ["Java", "Spring Boot", "Kafka", "MongoDB", "Azure"],
    },
  ],

  /* ----------------------------------------------------- currently window */
  now: {
    building: "MINIMAL AI",
    buildingNote: "An AI-agentic system, under active development",
    learning: ["Model fine-tuning & evals", "Distributed backend design", "Rust systems programming"],
    openTo: "Open-source collaboration · AI/ML research · Interesting backend problems",
  },

  /* ------------------------------------------------------------ launchpad */
  // Each entry is a simple-icons slug, or `{ glyph }` for a mark the icon set
  // does not carry. `label` overrides the title, `hex` the brand colour.
  stack: [
    {
      group: "Languages",
      items: [
        { slug: "openjdk", label: "Java" },
        { slug: "python" },
        { slug: "typescript" },
        { slug: "javascript" },
        { slug: "rust", hex: "#E4A88A" },
        { slug: "c" },
      ],
    },
    {
      group: "Backend",
      items: [
        { slug: "springboot", label: "Spring" },
        { slug: "apachekafka", label: "Kafka", hex: "#9a9aa4" },
        { slug: "nodedotjs", label: "Node" },
        { slug: "express", hex: "#E8E8E8" },
        { slug: "redis" },
        { slug: "flask", hex: "#E8E8E8" },
      ],
    },
    {
      group: "Frontend",
      items: [
        { slug: "react" },
        { slug: "redux" },
        { slug: "vite" },
        { slug: "nextdotjs", label: "Next.js", hex: "#E8E8E8" },
        { slug: "mui", label: "Material UI" },
        { slug: "tailwindcss", label: "Tailwind" },
      ],
    },
    {
      group: "AI / ML",
      items: [
        { slug: "pytorch" },
        { slug: "huggingface", label: "HF" },
        { slug: "scikitlearn", label: "sklearn" },
        { slug: "langchain", hex: "#7FC8FF" },
        { slug: "numpy" },
        { slug: "pandas", hex: "#8E7CC3" },
      ],
    },
    {
      group: "Cloud & Data",
      items: [
        { glyph: "azure", label: "Azure", hex: "#3ba0e8" },
        { slug: "docker" },
        { slug: "mongodb" },
        { slug: "postgresql" },
        { slug: "mysql" },
        { slug: "sqlite", hex: "#4a9ec9" },
      ],
    },
    {
      group: "Tooling",
      items: [
        { slug: "git" },
        { slug: "github", hex: "#c9c9d2" },
        { slug: "githubactions", label: "Actions" },
        { slug: "bruno" },
        { slug: "intellijidea", label: "IntelliJ", hex: "#c9c9d2" },
        { slug: "claude", label: "Claude Code" },
      ],
    },
  ],

  /* ------------------------------------------------------------- projects */
  // Each featured project gets its own row in the Finder window, and each row
  // is its own image — so the row links to that project's interactive demo.
  featured: [
    {
      repo: "Omni-Memory",
      name: "Omni Memory",
      demo: "omni-memory",
      icon: "brain",
      tint: "#bf5af2",
      tagline: "Persistent, branch-aware memory for AI coding agents",
      blurb:
        "Zero-dependency Python/SQLite memory layer for Claude Code and Antigravity. BM25F ranking, tree-sitter staleness detection, cross-IDE sync.",
      tags: ["Python", "SQLite", "tree-sitter", "MCP"],
      badge: "pypi",
    },
    {
      repo: "Mixture_Of_Recursions",
      name: "Mixture of Recursions",
      demo: "mixture-of-recursions",
      icon: "layers",
      tint: "#ff9f0a",
      tagline: "Adaptive-depth language model, built from scratch",
      blurb:
        "LLaMA-style decoder routing each token through a variable number of layers. 2× faster inference, 40–60% fewer FLOPs, ~3× fewer parameters.",
      tags: ["PyTorch", "RoPE", "SwiGLU", "Research"],
    },
    {
      repo: "Shanks",
      name: "Shanks",
      demo: "shanks",
      icon: "waveform",
      tint: "#64d2ff",
      tagline: "A voice assistant that can actually operate your machine",
      blurb:
        "Speech in and out natively through the Gemini Live API — no transcribe-then-synthesise chain. Reads hardware state, controls the desktop, remembers context.",
      tags: ["TypeScript", "Gemini Live", "Voice"],
    },
    {
      repo: "make-it-personal",
      name: "Vault",
      demo: "vault",
      icon: "lock",
      tint: "#32d74b",
      tagline: "Portable encrypted vault that lives on the drive itself",
      blurb:
        "The binary rides on the USB stick. Plug it into any machine, enter a password, get your files — nothing installed on the host. Rust, no runtime.",
      tags: ["Rust", "Cryptography", "Zero-install"],
    },
  ],

  // Extra rows in the Finder list under the featured cards.
  moreProjects: [
    { repo: "local-rag-chatbot", note: "Hybrid local + cloud multimodal RAG workspace" },
    { repo: "Phish-Guard", note: "Real-time ML phishing detection extension" },
    { repo: "Neural-Networks-Scratch", note: "Neural nets from first principles" },
    { repo: "NexTalk", note: "Real-time chat application" },
  ],

  /* --------------------------------------------------------- achievements */
  achievements: {
    // `live` keys are filled in at build time from the API; `value` is the
    // fallback used when the network is unavailable.
    milestones: [
      { live: "pypiDownloads", label: "PyPI downloads", sub: "omni-memory-agent", value: "5k+", tint: "#bf5af2" },
      { live: "stars", label: "GitHub stars", sub: "across public repos", value: "28", tint: "#ffd60a" },
      { live: "repos", label: "Public repos", sub: "shipped and counting", value: "32", tint: "#0a84ff" },
      { live: "commits", label: "Commits", sub: "last 12 months", value: "150", tint: "#32d74b" },
    ],
    certificatesRepo: "Certificates",
    certificates: [
      { file: "AI-900_MS_Certificate.pdf", title: "Azure AI Fundamentals (AI-900)", issuer: "Microsoft" },
      {
        file: "Naukri_Campus_Young_Turks_Merit_Certificate.pdf",
        title: "Young Turks — Merit Certificate",
        issuer: "Naukri Campus",
      },
      { file: "hack_on_hills_certificate.pdf", title: "Hack On Hills — Hackathon", issuer: "NIT Hamirpur" },
      { file: "Cyber_Security_Certificate.pdf", title: "Cyber Security", issuer: "NPTEL" },
      { file: "Linux_Certificate.pdf", title: "Linux Fundamentals", issuer: "Coursera" },
      { file: "DBMS_Certificate.pdf", title: "Database Management Systems", issuer: "NPTEL" },
    ],
  },

  /* --------------------------------------------------------------- resume */
  resume: {
    file: "resume.pdf",
    updated: "August 2026",
    // Mirrors the real document, so the Preview window is not a mock.
    sections: [
      {
        head: "Experience",
        rows: [
          ["Software Engineer", "Bajaj Finserv Health · 2025—Present"],
          ["Java · Spring Boot · Kafka · MongoDB · Azure", null],
        ],
      },
      {
        head: "Projects",
        rows: [
          ["Omni Memory", "Python · SQLite · tree-sitter · 5,000+ downloads"],
          ["Mixture-of-Recursions", "PyTorch · 2× faster inference"],
        ],
      },
      {
        head: "Education",
        rows: [["B.Tech Computer Science", "Chitkara University · Aug 2023—May 2027"]],
      },
    ],
    highlights: [
      "Software Engineer at Bajaj Finserv Health — event-driven microservices on Azure",
      "Author of Omni-Memory, 5,000+ downloads on PyPI",
      "MoR: 2× faster inference at 40–60% fewer FLOPs",
      "Java, Python, TypeScript · Spring Boot, React, PyTorch",
    ],
  },

  /* ------------------------------------------------------------- the dock */
  // Rendered as one glass bar, sliced so each icon carries its own link.
  dock: [
    { id: "finder", label: "Projects", url: `https://github.com/${GH}?tab=repositories` },
    { id: "resume", label: "Résumé", url: `https://github.com/${GH}/${GH}/blob/main/resume.pdf` },
    { id: "trophy", label: "Awards", url: `https://github.com/${GH}/Certificates` },
    { id: "github", label: "GitHub", url: `https://github.com/${GH}` },
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/singhabhinav04/" },
    { id: "discord", label: "Discord", url: "https://discord.gg/ygYnFbre" },
    { id: "mail", label: "Email", url: "mailto:heysinghabhinav@gmail.com" },
    { id: "terminal", label: "Source", url: `https://github.com/${GH}/${GH}` },
  ],

  /* ------------------------------------------------------ the menu bar */
  // Its own row of slices, so every menu title is a real link.
  menu: [
    { label: "Projects", url: `https://github.com/${GH}?tab=repositories` },
    { label: "Résumé", url: `https://github.com/${GH}/${GH}/blob/main/resume.pdf` },
    { label: "Achievements", url: `https://github.com/${GH}/Certificates` },
    { label: "Demos", url: PAGES },
    { label: "Contact", url: "mailto:heysinghabhinav@gmail.com" },
  ],

  /* ---------------------------------------------------------------- misc */
  pypiPackage: "omni-memory-agent",
  quote: "Make it work, make it right, make it fast — then make it remember.",
};

export const LAYOUT = {
  width: 940, // full-slice width
  gap: 14, // gutter between a pair of half slices
  pad: 18, // window inner padding
  radius: 11, // macOS window corner radius
  titlebar: 38, // titlebar height
};
