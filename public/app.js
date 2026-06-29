const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
});

document.querySelectorAll("details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll("details[open]").forEach((openDetail) => {
      if (openDetail !== detail) openDetail.open = false;
    });
  });
});

const revealTargets = document.querySelectorAll(
  ".hero-copy, .hero-visual, .problem article, .features article, .steps article, .demo-copy, .demo-stage, .dashboard-copy, .dashboard-visual, .pricing article, .faq details, .final-cta > *, .site-footer > *"
);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealTargets.forEach((target, index) => {
    target.classList.add("reveal");
    target.style.animationDelay = `${Math.min(index % 6, 5) * 45}ms`;
    observer.observe(target);
  });
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}

const demoSteps = Array.from(document.querySelectorAll("[data-demo-step]"));
const demoPanels = Array.from(document.querySelectorAll("[data-demo-panel]"));
let activeDemoStep = 0;
let demoTimer = null;

function setDemoStep(index) {
  activeDemoStep = index;
  demoSteps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === activeDemoStep);
  });
  demoPanels.forEach((panel, panelIndex) => {
    panel.classList.toggle("is-active", panelIndex === activeDemoStep);
  });
}

function scheduleDemoLoop() {
  if (!demoSteps.length) return;
  window.clearInterval(demoTimer);
  demoTimer = window.setInterval(() => {
    setDemoStep((activeDemoStep + 1) % demoSteps.length);
  }, 3200);
}

demoSteps.forEach((step, index) => {
  step.addEventListener("click", () => {
    setDemoStep(index);
    scheduleDemoLoop();
  });
});

scheduleDemoLoop();

document.querySelectorAll(".motion-scene").forEach((scene) => {
  scene.addEventListener("pointermove", (event) => {
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.style.setProperty("--mx", `${x * 14}px`);
    scene.style.setProperty("--my", `${y * 14}px`);
  });

  scene.addEventListener("pointerleave", () => {
    scene.style.setProperty("--mx", "0px");
    scene.style.setProperty("--my", "0px");
  });
});
