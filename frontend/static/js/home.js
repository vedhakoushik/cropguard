const heroOrbWrap = document.getElementById("heroOrbWrap");
const homeWrap = document.querySelector(".home-wrap");
const heroTitle = document.getElementById("heroTitle");
const heroWords = heroTitle ? Array.from(heroTitle.querySelectorAll(".hero-word")) : [];
const revealCards = Array.from(document.querySelectorAll(".reveal-card"));

if (heroOrbWrap && homeWrap) {
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let textX = 0;
  let textY = 0;
  let currentTextX = 0;
  let currentTextY = 0;

  window.addEventListener("mousemove", event => {
    const { innerWidth, innerHeight } = window;
    pointerX = ((event.clientX / innerWidth) - 0.5) * 26;
    pointerY = ((event.clientY / innerHeight) - 0.5) * 20;
    textX = ((event.clientX / innerWidth) - 0.5) * 18;
    textY = ((event.clientY / innerHeight) - 0.5) * 12;
  });

  function animateOrb() {
    currentX += (pointerX - currentX) * 0.06;
    currentY += (pointerY - currentY) * 0.06;
    currentTextX += (textX - currentTextX) * 0.08;
    currentTextY += (textY - currentTextY) * 0.08;
    heroOrbWrap.style.setProperty("--orb-x", `${currentX.toFixed(2)}px`);
    heroOrbWrap.style.setProperty("--orb-y", `${currentY.toFixed(2)}px`);

    if (heroWords.length) {
      heroWords.forEach((word, index) => {
        const depth = (index + 1) / heroWords.length;
        const offsetX = currentTextX * depth;
        const offsetY = currentTextY * depth;
        word.style.transform = `translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0)`;
      });
    }

    requestAnimationFrame(animateOrb);
  }

  animateOrb();
}

if (revealCards.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  revealCards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 60, 320)}ms`;
    observer.observe(card);
  });
}
