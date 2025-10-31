/* script.js
   - Canvas particle system (copos de nieve/neón)
   - Keyboard micro-interactions: random light color, key press ripple
   - Accessible: keyboard focus triggers same effect as hover
*/

(() => {
  /* ----- Config & helpers ----- */
  const canvas = document.getElementById('snowCanvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = innerWidth;
  let H = canvas.height = innerHeight;
  let particles = [];
  const PARTICLE_COUNT = Math.round((W * H) / 70000); // scales with screen size
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // color palette (icy neon)
  const palette = [
    'rgba(127,227,255,0.9)',
    'rgba(123,216,255,0.85)',
    'rgba(190,245,255,0.6)',
    'rgba(170,230,255,0.5)'
  ];

  /* ----- Particle class ----- */
  class Particle {
    constructor() {
      this.reset();
    }
    reset(){
      this.x = Math.random() * W;
      this.y = Math.random() * -H * 0.5;
      this.vy = 0.2 + Math.random() * 1.2;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.size = 1 + Math.random() * 4;
      this.life = 0;
      this.ttl = 80 + Math.random() * 220;
      this.color = palette[Math.floor(Math.random() * palette.length)];
      this.alpha = 0.08 + Math.random() * 0.9;
      this.spin = Math.random() * 0.06 - 0.03;
    }
    update(){
      this.x += this.vx;
      this.y += this.vy;
      this.vx += Math.sin(this.life * 0.01) * 0.002;
      this.life++;
      if (this.y > H + 20 || this.life > this.ttl) this.reset();
    }
    draw(){
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(this.alpha, 0.95));
      ctx.translate(this.x, this.y);
      ctx.rotate(this.life * this.spin);
      // draw a rounded snowflake-ish polygon
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 1.2);
      for (let i = 1; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.lineTo(Math.sin(ang) * this.size * (0.8 + (i%2)*0.5), Math.cos(ang) * this.size * (0.8 + (i%2)*0.5));
      }
      ctx.closePath();
      // outer glow
      ctx.shadowBlur = 14;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  /* ----- Init particles ----- */
  function initParticles(){
    particles = [];
    for (let i = 0; i < Math.max(20, PARTICLE_COUNT); i++) {
      particles.push(new Particle());
    }
  }

  /* ----- Animation loop ----- */
  let rafId = null;
  function resize(){
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    initParticles();
  }
  window.addEventListener('resize', () => {
    resize();
  }, {passive:true});

  function render(){
    ctx.clearRect(0,0,W,H);
    // faint gradient overlay
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, 'rgba(10,18,30,0.0)');
    g.addColorStop(1, 'rgba(5,10,18,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    for (let p of particles) {
      p.update();
      p.draw();
    }
    if (!prefersReduced) rafId = requestAnimationFrame(render);
  }

  /* ----- Keyboard interactions ----- */
  const keyboard = document.getElementById('keyboard');
  const keys = Array.from(document.querySelectorAll('.key'));
  const motionToggle = document.getElementById('motionToggle');
  const randomizeBtn = document.getElementById('randomizeBtn');

  // create ripple when key pressed / activated
  function keyPulse(el){
    el.animate([
      { boxShadow: '0 30px 90px rgba(80,220,255,0.12), 0 0 40px rgba(120,220,255,0.06) inset', transform: 'translateY(-8px) scale(1.02)' },
      { boxShadow: '0 10px 26px rgba(0,120,160,0.18), 0 0 22px rgba(80,200,255,0.03) inset', transform: 'translateY(-4px) scale(1.00)' }
    ], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1)'});
    // small light burst on top using canvas overlay
    burstLight(el);
  }

  // micro light burst: draw a transient radial on main canvas near element
  function burstLight(el){
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.max(rect.width, rect.height) * 1.6;
    let t = 0;
    const duration = 420;
    // draw temporary frames
    function frame(){
      t += 16;
      const progress = t / duration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (0.4 + progress));
      grd.addColorStop(0, 'rgba(160,240,255,' + (0.35 * (1 - progress)) + ')');
      grd.addColorStop(1, 'rgba(160,240,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      if (t < duration) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // pointer & keyboard event listeners
  keys.forEach(k => {
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      keyPulse(k);
    });
    k.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        keyPulse(k);
      }
    });
    k.addEventListener('focus', () => {
      // subtle elevate on focus
      k.style.transform = 'translateY(-8px) rotateX(6deg) rotateZ(-1deg)';
    });
    k.addEventListener('blur', () => {
      k.style.transform = '';
    });
  });

  /* ----- Motion toggle and random color ----- */
  motionToggle.addEventListener('change', (e) => {
    if (!e.target.checked){
      cancelAnimationFrame(rafId);
      rafId = null;
      ctx.clearRect(0,0,W,H);
    } else {
      if (!rafId) render();
    }
  });

  randomizeBtn.addEventListener('click', () => {
    // tweak palette slightly for variety
    for (let i = 0; i < palette.length; i++) {
      const shift = Math.random() * 40 - 20;
      palette[i] = `rgba(${120+Math.floor(Math.random()*120)},${180+Math.floor(Math.random()*70)},255,${0.6 + Math.random()*0.35})`;
    }
    // quick wobble on keyboard container
    const kb = document.querySelector('.keyboard');
    kb.animate([
      { transform: 'rotateX(4deg) translateY(0px)' },
      { transform: 'rotateX(-6deg) translateY(-6px)' },
      { transform: 'rotateX(3deg) translateY(0px)' }
    ], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)'});
  });

  /* ----- initial run ----- */
  function start(){
    resize();
    if (!prefersReduced) render();
    // subtle parallax on mouse move for ADHD-friendly motion
    const wrap = document.querySelector('.wrap');
    window.addEventListener('pointermove', (e) => {
      if (prefersReduced) return;
      const cx = innerWidth / 2;
      const cy = innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      const kb = document.querySelector('.keyboard');
      kb.style.transform = `translateZ(0) rotateX(${dy * 6}deg) rotateY(${dx * 8}deg)`;
    }, {passive:true});

    // friendly performance: pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId); rafId = null;
      } else {
        if (!rafId && motionToggle.checked && !prefersReduced) render();
      }
    });
  }

  start();

  // Expose small API for debugging (optional)
  window._TecladoHielo = { particles, initParticles, burstLight };

})();