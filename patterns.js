// ------------------------------------------------------------
// Patterns — mathematical sketches in plain canvas, no libraries.
// Ink and paper colours come from the page's CSS variables, so every
// piece follows the light/dark theme; a theme change restarts each
// sketch cleanly. `prefers-reduced-motion` gets finished, still images.
// Sketches only animate while on screen.
// ------------------------------------------------------------
(function () {
  'use strict';

  var mqDark  = window.matchMedia('(prefers-color-scheme: dark)');
  var mqStill = window.matchMedia('(prefers-reduced-motion: reduce)');

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Start an accumulating sketch briskly, then settle continuously into its
  // normal pace. This preserves the visible act of construction without
  // making a newly revealed canvas feel empty.
  function openingBoost(age, strength, decay) {
    return 1 + strength * Math.exp(-age / decay);
  }

  // ---------- sketch harness ----------
  var sketches = [];

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      sketches.forEach(function (s) {
        if (s.el !== e.target) return;
        s.visible = e.isIntersecting;
        if (s.visible && !s.initialized) restart(s);
      });
    });
  }, { rootMargin: '120px' });

  function fit(s) {
    s.w = s.el.clientWidth;
    s.h = s.el.clientHeight;
    if (s.w < 10 || s.h < 10) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.el.width = Math.round(s.w * dpr);
    s.el.height = Math.round(s.h * dpr);
    s.dpr = dpr;
    s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (s.impl.deferInit && !s.initialized && !s.visible) return;
    restart(s);
  }

  function restart(s) {
    if (s.w < 10 || s.h < 10) return;
    s.ink = css('--text');
    s.paper = css('--bg');
    s.ctx.clearRect(0, 0, s.w, s.h);
    s.impl.init(s);
    s.initialized = true;
    if (mqStill.matches) s.impl.still(s);
  }

  function restartAll() {
    sketches.forEach(function (s) {
      if (s.initialized) restart(s);
    });
  }

  function makeSketch(id, impl) {
    var el = document.getElementById(id);
    if (!el || !el.getContext) return;
    var ctx = el.getContext('2d');
    if (!ctx) return;
    var s = {
      el: el,
      ctx: ctx,
      impl: impl,
      w: 0,
      h: 0,
      dpr: 1,
      visible: false,
      initialized: false,
      state: {}
    };
    sketches.push(s);
    observer.observe(el);
    fit(s);
  }

  // ---------- 1 · Phyllotaxis ----------
  // Dots placed at theta = n * golden angle, r ∝ sqrt(n): the sunflower rule.
  // They appear one at a time; once grown, the whole head turns almost
  // imperceptibly (one revolution in about half an hour).
  var GOLDEN = Math.PI * (3 - Math.sqrt(5));

  var phyllotaxis = {
    DOTS: 720,
    GROW: 16,      // dots per second while filling in
    SPIN: 0.0035,  // radians per second once grown
    init: function (s) {
      s.state = { n: 0, rot: -0.4, age: 0 };
    },
    draw: function (s) {
      var ctx = s.ctx, st = s.state;
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.fillStyle = s.ink;
      var R = 0.455 * Math.min(s.w, s.h);
      var cx = s.w / 2, cy = s.h / 2;
      var count = Math.floor(st.n);
      for (var i = 0; i < count; i++) {
        var f = i / this.DOTS;
        var r = R * Math.sqrt(f);
        var a = i * GOLDEN + st.rot;
        ctx.globalAlpha = 0.9 - 0.25 * f;
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.8 + 1.7 * Math.sqrt(f), 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    frame: function (s, dt) {
      var st = s.state;
      st.age += dt;
      if (st.n < this.DOTS) {
        var rate = this.GROW * openingBoost(st.age, 5, 4);
        st.n = Math.min(this.DOTS, st.n + dt * rate);
      }
      else st.rot += dt * this.SPIN;
      this.draw(s);
    },
    still: function (s) {
      s.state.n = this.DOTS;
      this.draw(s);
    }
  };

  // ---------- 2 · Harmonograph ----------
  // A damped Lissajous figure: two decaying sines, one per axis, with a
  // near-rational frequency ratio and a hair of detune. The pen draws for
  // about a minute, rests, then the page fades the ink and starts another.
  var harmonograph = {
    RATIOS: [[2, 3], [3, 4], [3, 5], [4, 5], [5, 7]],
    T_END: 110,   // simulated seconds per figure
    SPEED: 1.6,   // simulated seconds per real second
    STEP: 0.004,  // integration step, simulated seconds
    init: function (s) {
      s.state = {};
      this.newFigure(s);
    },
    newFigure: function (s) {
      var st = s.state;
      var pq = this.RATIOS[Math.floor(Math.random() * this.RATIOS.length)];
      function detune() { return 1 + (Math.random() - 0.5) * 0.012; }
      st.fx = pq[0] * detune();
      st.fy = pq[1] * detune();
      st.px = Math.random() * 2 * Math.PI;
      st.py = Math.random() * 2 * Math.PI;
      st.dx = 0.028 + Math.random() * 0.014;
      st.dy = 0.028 + Math.random() * 0.014;
      st.t = 0;
      st.age = 0;
      st.hold = 0;
      st.fade = 0;
      st.phase = 'draw';
    },
    at: function (s, t) {
      var st = s.state;
      var A = 0.42 * Math.min(s.w, s.h);
      return [
        s.w / 2 + A * Math.sin(st.fx * t + st.px) * Math.exp(-st.dx * t),
        s.h / 2 + A * Math.sin(st.fy * t + st.py) * Math.exp(-st.dy * t)
      ];
    },
    trace: function (s, t0, t1) {
      var ctx = s.ctx;
      ctx.strokeStyle = s.ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      var p = this.at(s, t0);
      ctx.moveTo(p[0], p[1]);
      for (var t = t0 + this.STEP; t <= t1; t += this.STEP) {
        p = this.at(s, t);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    frame: function (s, dt) {
      var st = s.state, ctx = s.ctx;
      if (st.phase === 'draw') {
        st.age += dt;
        var speed = this.SPEED * openingBoost(st.age, 2, 5);
        var t1 = Math.min(st.t + dt * speed, this.T_END);
        this.trace(s, st.t, t1);
        st.t = t1;
        if (st.t >= this.T_END) st.phase = 'hold';
      } else if (st.phase === 'hold') {
        st.hold += dt;
        if (st.hold > 14) st.phase = 'fade';
      } else {
        st.fade += dt;
        ctx.fillStyle = s.paper;
        ctx.globalAlpha = 1 - Math.exp(-dt * 1.3);
        ctx.fillRect(0, 0, s.w, s.h);
        ctx.globalAlpha = 1;
        if (st.fade > 3.5) {
          ctx.clearRect(0, 0, s.w, s.h);
          this.newFigure(s);
        }
      }
    },
    still: function (s) {
      this.trace(s, 0, this.T_END);
    }
  };

  // ---------- 3 · Clifford attractor ----------
  // The orbit of a single point under two coupled sine maps, stippled at low
  // alpha so its invariant density condenses out of the noise like ink
  // settling. When it has settled, the page fades it and moves to the next
  // set of coefficients.
  var clifford = {
    SETS: [
      [-1.4, 1.6, 1.0, 0.7],
      [1.7, 1.7, 0.6, 1.2],
      [-1.7, 1.3, -0.1, -1.2],
      [-1.8, -2.0, -0.5, -0.9]
    ],
    CAP: 420000,  // points per figure
    RATE: 6500,   // points per second
    init: function (s) {
      s.state = { set: Math.floor(Math.random() * this.SETS.length) };
      this.begin(s);
    },
    begin: function (s) {
      var st = s.state;
      var p = this.SETS[st.set];
      st.a = p[0]; st.b = p[1]; st.c = p[2]; st.d = p[3];
      st.x = 0.08; st.y = 0.12;
      st.count = 0;
      st.age = 0;
      st.hold = 0;
      st.fade = 0;
      st.phase = 'draw';
      for (var i = 0; i < 64; i++) this.step(st);  // settle onto the attractor
    },
    step: function (st) {
      var nx = Math.sin(st.a * st.y) + st.c * Math.cos(st.a * st.x);
      var ny = Math.sin(st.b * st.x) + st.d * Math.cos(st.b * st.y);
      st.x = nx;
      st.y = ny;
    },
    stipple: function (s, n, alpha) {
      var st = s.state, ctx = s.ctx;
      var sx = s.w * 0.86 / (2 * (1 + Math.abs(st.c)));
      var sy = s.h * 0.86 / (2 * (1 + Math.abs(st.d)));
      ctx.fillStyle = s.ink;
      ctx.globalAlpha = alpha;
      for (var i = 0; i < n; i++) {
        this.step(st);
        ctx.fillRect(s.w / 2 + st.x * sx - 0.4, s.h / 2 + st.y * sy - 0.4, 0.8, 0.8);
      }
      ctx.globalAlpha = 1;
    },
    frame: function (s, dt) {
      var st = s.state, ctx = s.ctx;
      if (st.phase === 'draw') {
        st.age += dt;
        var rate = this.RATE * openingBoost(st.age, 7, 5);
        var n = Math.min(Math.round(dt * rate), this.CAP - st.count);
        this.stipple(s, n, 0.085);
        st.count += n;
        if (st.count >= this.CAP) st.phase = 'hold';
      } else if (st.phase === 'hold') {
        st.hold += dt;
        if (st.hold > 16) st.phase = 'fade';
      } else {
        st.fade += dt;
        ctx.fillStyle = s.paper;
        ctx.globalAlpha = 1 - Math.exp(-dt * 1.3);
        ctx.fillRect(0, 0, s.w, s.h);
        ctx.globalAlpha = 1;
        if (st.fade > 3.5) {
          ctx.clearRect(0, 0, s.w, s.h);
          st.set = (st.set + 1) % this.SETS.length;
          this.begin(s);
        }
      }
    },
    still: function (s) {
      this.stipple(s, 180000, 0.085);
    }
  };

  // ---------- 4 · Voxel crystal ----------
  // A 3D Ulam–Warburton automaton: a block is born wherever exactly one of
  // its six face-neighbours is a block. Grown from a single seed, drawn in
  // isometric projection with flat ink washes, one block at a time. The
  // growth is fractal: whole generations of six alternate with bursts of 150.
  var voxels = {
    GENS: 13,     // L1 radius of the finished crystal
    RATE: 12,     // blocks placed per second
    PAUSE: 1.3,   // rest between generations, seconds
    NB: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
    init: function (s) {
      s.state = {
        alive: { '0,0,0': true },
        drawn: [],
        queue: [[0, 0, 0]],
        gen: 0,
        age: 0, acc: 0, pause: 0, hold: 0, fade: 0,
        phase: 'grow',
        tones: this.tones(s)
      };
    },
    tones: function (s) {
      function rgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        var n = parseInt(hex, 16);
        return [n >> 16 & 255, n >> 8 & 255, n & 255];
      }
      var p = rgb(s.paper), i = rgb(s.ink);
      function mix(a) {
        return 'rgb(' +
          Math.round(p[0] + (i[0] - p[0]) * a) + ',' +
          Math.round(p[1] + (i[1] - p[1]) * a) + ',' +
          Math.round(p[2] + (i[2] - p[2]) * a) + ')';
      }
      // light from the upper left: top faces palest, right faces deepest
      return {
        top: mix(0.10),
        left: mix(0.22),
        right: mix(0.34),
        edge: 'rgba(' + i[0] + ',' + i[1] + ',' + i[2] + ',0.35)'
      };
    },
    nextGen: function (st) {
      var counts = {}, coords = {}, k, nk;
      for (k in st.alive) {
        var c = k.split(',');
        var x = +c[0], y = +c[1], z = +c[2];
        for (var d = 0; d < 6; d++) {
          var nx = x + this.NB[d][0], ny = y + this.NB[d][1], nz = z + this.NB[d][2];
          nk = nx + ',' + ny + ',' + nz;
          if (st.alive[nk]) continue;
          counts[nk] = (counts[nk] || 0) + 1;
          coords[nk] = [nx, ny, nz];
        }
      }
      var born = [];
      for (nk in counts) if (counts[nk] === 1) born.push(coords[nk]);
      for (var j = born.length - 1; j > 0; j--) {  // shuffle: organic placement order
        var r = Math.floor(Math.random() * (j + 1));
        var t = born[j]; born[j] = born[r]; born[r] = t;
      }
      for (var i = 0; i < born.length; i++) st.alive[born[i].join(',')] = true;
      return born;
    },
    draw: function (s) {
      var st = s.state, ctx = s.ctx;
      ctx.clearRect(0, 0, s.w, s.h);
      var u = 0.87 * Math.min(s.w, s.h) / 2 / this.GENS;  // cube edge, px
      var A = 0.866 * u, B = 0.5 * u, C = u;
      var cx = s.w / 2, cy = s.h / 2;
      function P(x, y, z) { return [cx + (x - y) * A, cy + (x + y) * B - z * C]; }
      function face(a, b, c, d, fill) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.stroke();
      }
      // painter's order: the camera sits toward +(1,1,1), so far-to-near is
      // ascending x+y+z, and the three visible faces are +x, +y, +z
      st.drawn.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
      ctx.strokeStyle = st.tones.edge;
      ctx.lineWidth = 0.7;
      for (var i = 0; i < st.drawn.length; i++) {
        var v = st.drawn[i];
        var x = v[0], y = v[1], z = v[2];
        face(P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1), st.tones.top);
        face(P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1), st.tones.left);
        face(P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1), st.tones.right);
      }
    },
    frame: function (s, dt) {
      var st = s.state, ctx = s.ctx;
      if (st.phase === 'grow') {
        st.age += dt;
        if (st.queue.length) {
          var rate = this.RATE * openingBoost(st.age, 3, 6);
          st.acc += dt * rate;
          var take = Math.min(Math.floor(st.acc), st.queue.length);
          if (take > 0) {
            st.acc -= take;
            for (var i = 0; i < take; i++) st.drawn.push(st.queue.shift());
            this.draw(s);
          }
        } else if (st.gen < this.GENS) {
          st.pause += dt;
          // Early generations are tiny, so their pauses grow gradually toward
          // the full contemplative beat instead of dominating the opening.
          var pause = this.PAUSE * (0.25 + 0.75 * st.gen / this.GENS);
          if (st.pause > pause) {
            st.pause = 0;
            st.gen++;
            st.queue = this.nextGen(st);
          }
        } else {
          st.phase = 'hold';
        }
      } else if (st.phase === 'hold') {
        st.hold += dt;
        if (st.hold > 16) st.phase = 'fade';
      } else {
        st.fade += dt;
        ctx.fillStyle = s.paper;
        ctx.globalAlpha = 1 - Math.exp(-dt * 1.3);
        ctx.fillRect(0, 0, s.w, s.h);
        ctx.globalAlpha = 1;
        if (st.fade > 3.5) {
          ctx.clearRect(0, 0, s.w, s.h);
          this.init(s);
        }
      }
    },
    still: function (s) {
      var st = s.state;
      st.drawn = st.drawn.concat(st.queue);
      st.queue = [];
      while (st.gen < this.GENS) {
        st.gen++;
        st.drawn = st.drawn.concat(this.nextGen(st));
      }
      st.phase = 'hold';
      this.draw(s);
    }
  };

  // ---------- 5 · Terrain from noise ----------
  // One finished height field is sampled on progressively finer meshes. The
  // broad geography therefore persists while the same coastline gains detail,
  // instead of independent noise layers repeatedly eroding and regrowing it.
  var terrain = {
    SIZE: 480,
    DURATION: 28,
    deferInit: true,
    LEVEL_SIZES: [18, 28, 44, 68, 104, 160, 248, 480],
    LEVEL_OCTAVES: [2, 3, 4, 5, 6, 6, 7, 8],
    AMPS: [0.55, 0.28, 0.14, 0.07, 0.035, 0.018, 0.009, 0.0045],
    FREQS: [0.9, 1.8, 3.6, 7.2, 14.4, 28.8, 57.6, 115.2],
    DETAIL_START: 5,

    hash: function (x, y, seed) {
      var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
      h = Math.imul(h ^ h >>> 13, 1274126177);
      return ((h ^ h >>> 16) >>> 0) / 4294967295;
    },
    noise: function (x, y, seed) {
      var x0 = Math.floor(x), y0 = Math.floor(y);
      var tx = x - x0, ty = y - y0;
      var ux = tx * tx * (3 - 2 * tx);
      var uy = ty * ty * (3 - 2 * ty);
      var a = this.hash(x0, y0, seed);
      var b = this.hash(x0 + 1, y0, seed);
      var c = this.hash(x0, y0 + 1, seed);
      var d = this.hash(x0 + 1, y0 + 1, seed);
      var top = a + (b - a) * ux;
      var bottom = c + (d - c) * ux;
      return 2 * (top + (bottom - top) * uy) - 1;
    },
    smooth: function (x) {
      x = Math.max(0, Math.min(1, x));
      return x * x * x * (x * (x * 6 - 15) + 10);
    },
    rgb: function (hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = parseInt(hex, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    },
    heightAt: function (x, y, seed, octaves) {
      var warpX = this.noise((x + 1.8) * 0.72, (y - 0.4) * 0.72, seed + 101);
      var warpY = this.noise((x - 0.3) * 0.72, (y + 1.6) * 0.72, seed + 211);
      var qx = x + 0.25 * warpX;
      var qy = y + 0.25 * warpY;
      var h = 0.035;
      var broadOctaves = Math.min(octaves, this.DETAIL_START);
      var octave;
      for (octave = 0; octave < broadOctaves; octave++) {
        var f = this.FREQS[octave];
        h += this.AMPS[octave] * this.noise(
          (qx + 1.17) * f + octave * 3.1,
          (qy - 0.83) * f - octave * 2.7,
          seed + octave * 7919
        );
      }
      // An irregular envelope keeps the map finite without pulling its outer
      // coasts onto a visibly elliptical contour.
      var edgeNoise =
        0.72 * this.noise((qx + 2.4) * 1.35, (qy - 1.7) * 1.35, seed + 401) +
        0.28 * this.noise((qx - 1.3) * 2.70, (qy + 2.1) * 2.70, seed + 503);
      var edgeX = x + 0.14 * warpX;
      var edgeY = y + 0.14 * warpY;
      var radius = Math.sqrt(Math.pow(edgeX / 1.08, 2) + Math.pow(edgeY / 0.98, 2));
      var localReach = 0.72 + 0.13 * edgeNoise;
      h -= 1.18 * this.smooth((radius - localReach) / 0.20);

      // This guard acts only at the extreme edge, where it cannot dictate the
      // visible silhouette, and ensures no rare positive patch is clipped.
      var frameRadius = Math.sqrt(Math.pow(x / 0.99, 2) + Math.pow(y / 0.93, 2));
      h -= 1.35 * this.smooth((frameRadius - 0.94) / 0.10);

      // Finer octaves affect only the band around sea level. This gives the
      // coast nested bays and headlands while leaving the broad geography and
      // inland contours calm as the sampling mesh is refined.
      if (octaves > this.DETAIL_START) {
        var coastWeight = 1 - this.smooth(Math.abs(h) / 0.16);
        var coastDetail = 0;
        for (octave = this.DETAIL_START; octave < octaves; octave++) {
          f = this.FREQS[octave];
          coastDetail += this.AMPS[octave] * this.noise(
            (qx + 1.17) * f + octave * 3.1,
            (qy - 0.83) * f - octave * 2.7,
            seed + octave * 7919
          );
        }
        h += coastWeight * coastDetail;
      }
      return h;
    },
    buildLevel: function (n, seed, index) {
      var values = new Float32Array(n * n);
      var octaves = this.LEVEL_OCTAVES[index];
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          var nx = 2 * x / (n - 1) - 1;
          var ny = 2 * y / (n - 1) - 1;
          values[y * n + x] = this.heightAt(nx, ny, seed, octaves);
        }
      }
      return { n: n, values: values };
    },
    sample: function (level, x, y, size) {
      var gx = x * (level.n - 1) / (size - 1);
      var gy = y * (level.n - 1) / (size - 1);
      var x0 = Math.floor(gx), y0 = Math.floor(gy);
      var x1 = Math.min(level.n - 1, x0 + 1);
      var y1 = Math.min(level.n - 1, y0 + 1);
      var tx = gx - x0, ty = gy - y0;
      var a = level.values[y0 * level.n + x0];
      var b = level.values[y0 * level.n + x1];
      var c = level.values[y1 * level.n + x0];
      var d = level.values[y1 * level.n + x1];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    },
    init: function (s) {
      // A fixed seed makes this a composed piece rather than a map-quality
      // lottery on every reload.
      var seed = 31415926;
      var levels = [];
      for (var i = 0; i < this.LEVEL_SIZES.length; i++) {
        levels.push(this.buildLevel(this.LEVEL_SIZES[i], seed, i));
      }
      var size = this.SIZE;
      var buffer = document.createElement('canvas');
      buffer.width = buffer.height = size;
      var bctx = buffer.getContext('2d');
      s.state = {
        age: 0,
        renderWait: 0,
        renderInterval: 1 / 15,
        phase: 'draw',
        levels: levels,
        size: size,
        heights: new Float32Array(size * size),
        buffer: buffer,
        bctx: bctx,
        image: bctx.createImageData(size, size)
      };
      this.draw(s, 0);
    },
    draw: function (s, position) {
      var st = s.state;
      var size = st.size;
      var heights = st.heights;
      var data = st.image.data;
      var ink = this.rgb(s.ink);
      var lo = Math.min(st.levels.length - 1, Math.floor(position));
      var hi = Math.min(st.levels.length - 1, lo + 1);
      // Linear interpolation avoids a visible ease-in/ease-out pulse at every
      // mesh boundary. The increasing resolution is now one continuous act.
      var mix = position - lo;
      var x, y, i;

      for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
          i = y * size + x;
          var a = this.sample(st.levels[lo], x, y, size);
          var b = this.sample(st.levels[hi], x, y, size);
          heights[i] = a + (b - a) * mix;
        }
      }

      for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
          i = y * size + x;
          var h = heights[i];
          var left = heights[y * size + Math.max(0, x - 1)];
          var right = heights[y * size + Math.min(size - 1, x + 1)];
          var up = heights[Math.max(0, y - 1) * size + x];
          var down = heights[Math.min(size - 1, y + 1) * size + x];
          var gradient = 0.5 * Math.hypot(right - left, down - up);
          var safeGradient = Math.max(gradient, 0.000001);
          var feather = 0.55 * safeGradient;
          var coverage = this.smooth(0.5 + h / (2 * feather));
          var elevation = Math.max(0, Math.min(1, h / 0.55));
          var alpha = (22 + 52 * elevation) * coverage;
          if (coverage > 0 && h > 0.035) {
            var contour = h / 0.09;
            var distance = Math.abs(contour - Math.round(contour));
            if (distance < 0.04) {
              alpha = Math.max(alpha, 68 * (1 - distance / 0.04) * coverage);
            }
          }
          var p = i * 4;
          data[p] = ink[0];
          data[p + 1] = ink[1];
          data[p + 2] = ink[2];
          data[p + 3] = Math.round(alpha);
        }
      }

      st.bctx.clearRect(0, 0, size, size);
      st.bctx.putImageData(st.image, 0, 0);
      s.ctx.clearRect(0, 0, s.w, s.h);
      s.ctx.imageSmoothingEnabled = true;
      var side = 0.92 * Math.min(s.w, s.h);
      s.ctx.drawImage(st.buffer, (s.w - side) / 2, (s.h - side) / 2, side, side);
      this.drawCoastline(s, heights, size, side);
    },
    drawCoastline: function (s, heights, size, side) {
      var ctx = s.ctx;
      var scale = side / (size - 1);

      function fraction(a, b) {
        var d = a - b;
        return d === 0 ? 0.5 : a / d;
      }

      ctx.save();
      ctx.translate((s.w - side) / 2, (s.h - side) / 2);
      ctx.scale(scale, scale);
      ctx.beginPath();

      for (var y = 0; y < size - 1; y++) {
        for (var x = 0; x < size - 1; x++) {
          var i = y * size + x;
          var tl = heights[i];
          var tr = heights[i + 1];
          var bl = heights[i + size];
          var br = heights[i + size + 1];
          var code =
            (tl > 0 ? 1 : 0) |
            (tr > 0 ? 2 : 0) |
            (br > 0 ? 4 : 0) |
            (bl > 0 ? 8 : 0);
          if (code === 0 || code === 15) continue;

          var top = fraction(tl, tr);
          var right = fraction(tr, br);
          var bottom = fraction(bl, br);
          var left = fraction(tl, bl);
          var edgeX = [x + top, x + 1, x + bottom, x];
          var edgeY = [y, y + right, y + 1, y + left];
          var segments;

          switch (code) {
            case 1:  segments = [3, 0]; break;
            case 2:  segments = [0, 1]; break;
            case 3:  segments = [3, 1]; break;
            case 4:  segments = [1, 2]; break;
            case 5:
              segments = tl + tr + br + bl > 0 ? [0, 1, 2, 3] : [3, 0, 1, 2];
              break;
            case 6:  segments = [0, 2]; break;
            case 7:  segments = [3, 2]; break;
            case 8:  segments = [2, 3]; break;
            case 9:  segments = [0, 2]; break;
            case 10:
              segments = tl + tr + br + bl > 0 ? [3, 0, 1, 2] : [0, 1, 2, 3];
              break;
            case 11: segments = [1, 2]; break;
            case 12: segments = [1, 3]; break;
            case 13: segments = [0, 1]; break;
            case 14: segments = [3, 0]; break;
          }

          for (var j = 0; j < segments.length; j += 2) {
            var a = segments[j], b = segments[j + 1];
            ctx.moveTo(edgeX[a], edgeY[a]);
            ctx.lineTo(edgeX[b], edgeY[b]);
          }
        }
      }

      ctx.strokeStyle = s.ink;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 0.9 / scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    },
    frame: function (s, dt) {
      var st = s.state;
      if (st.phase !== 'draw') return;
      st.age += dt;
      st.renderWait += dt;
      var last = st.levels.length - 1;
      if (st.renderWait >= st.renderInterval) {
        st.renderWait = 0;
        this.draw(s, Math.min(last, st.age * last / this.DURATION));
      }
      if (st.age >= this.DURATION) {
        this.draw(s, last);
        st.phase = 'done';
      }
    },
    still: function (s) {
      this.draw(s, s.state.levels.length - 1);
    }
  };

  // ---------- 6 · Perlin fBm heightmap ----------
  // True 3D gradient noise is sampled on a hemisphere. Perlin's quintic fade
  // blends each lattice cell; independent octaves accumulate from broad
  // continents into progressively finer islands and coasts.
  var heightmap = {
    SIZE: 420,
    OCTAVES: 7,
    deferInit: true,
    SEED: 18070830,
    BASE_FREQUENCY: 1.35,
    PERSISTENCE: 0.55,
    LAND_FRACTION: 0.31,
    TERRACE_STEP: 0.10,
    TERRACE_ALPHA: [20, 24, 29, 35, 42],
    OCEAN_ALPHA: 2,
    OUTSIDE: -1000,
    YAW: -0.58,
    PITCH: 0.32,
    DURATION: 28,
    stages: null,

    fade: function (t) {
      return ((6 * t - 15) * t + 10) * t * t * t;
    },
    smooth: function (t) {
      t = Math.max(0, Math.min(1, t));
      return ((6 * t - 15) * t + 10) * t * t * t;
    },
    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },
    gradient: function (hash, x, y, z) {
      var h = hash & 15;
      var u = h < 8 ? x : y;
      var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return (h & 1 ? -u : u) + (h & 2 ? -v : v);
    },
    permutation: function (seed) {
      var values = new Uint16Array(256);
      for (var i = 0; i < 256; i++) values[i] = i;

      var state = seed >>> 0;
      function random() {
        state = (state + 0x6D2B79F5) >>> 0;
        var t = state;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }

      for (i = 255; i > 0; i--) {
        var j = Math.floor(random() * (i + 1));
        var swap = values[i];
        values[i] = values[j];
        values[j] = swap;
      }

      var doubled = new Uint16Array(512);
      for (i = 0; i < 512; i++) doubled[i] = values[i & 255];
      return doubled;
    },
    perlin: function (x, y, z, permutation) {
      var floorX = Math.floor(x), floorY = Math.floor(y), floorZ = Math.floor(z);
      var X = floorX & 255, Y = floorY & 255, Z = floorZ & 255;
      var xf = x - floorX, yf = y - floorY, zf = z - floorZ;
      var u = this.fade(xf), v = this.fade(yf), w = this.fade(zf);

      var A = permutation[X] + Y;
      var AA = permutation[A] + Z;
      var AB = permutation[A + 1] + Z;
      var B = permutation[X + 1] + Y;
      var BA = permutation[B] + Z;
      var BB = permutation[B + 1] + Z;

      var lower = this.lerp(
        this.lerp(
          this.gradient(permutation[AA], xf, yf, zf),
          this.gradient(permutation[BA], xf - 1, yf, zf),
          u
        ),
        this.lerp(
          this.gradient(permutation[AB], xf, yf - 1, zf),
          this.gradient(permutation[BB], xf - 1, yf - 1, zf),
          u
        ),
        v
      );
      var upper = this.lerp(
        this.lerp(
          this.gradient(permutation[AA + 1], xf, yf, zf - 1),
          this.gradient(permutation[BA + 1], xf - 1, yf, zf - 1),
          u
        ),
        this.lerp(
          this.gradient(permutation[AB + 1], xf, yf - 1, zf - 1),
          this.gradient(permutation[BB + 1], xf - 1, yf - 1, zf - 1),
          u
        ),
        v
      );
      return this.lerp(lower, upper, w);
    },
    rgb: function (hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = parseInt(hex, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    },
    buildStages: function () {
      var size = this.SIZE;
      var count = size * size;
      var cumulative = new Float32Array(count);
      var sphereX = new Float32Array(count);
      var sphereY = new Float32Array(count);
      var sphereZ = new Float32Array(count);
      var mask = new Uint8Array(count);
      var stages = [];
      var amplitude = 1;
      var frequency = this.BASE_FREQUENCY;
      var seed = this.SEED;
      var cosYaw = Math.cos(this.YAW), sinYaw = Math.sin(this.YAW);
      var cosPitch = Math.cos(this.PITCH), sinPitch = Math.sin(this.PITCH);

      // Each canvas point inside the disc is lifted onto the visible
      // hemisphere, then turned to a composed viewing angle.
      for (var y = 0; y < size; y++) {
        var sy = 2 * y / (size - 1) - 1;
        for (var x = 0; x < size; x++) {
          var sx = 2 * x / (size - 1) - 1;
          var radiusSquared = sx * sx + sy * sy;
          var i = y * size + x;
          if (radiusSquared > 1) continue;

          var px = sx;
          var py = -sy;
          var pz = Math.sqrt(1 - radiusSquared);
          var turnedX = px * cosYaw + pz * sinYaw;
          var turnedZ = -px * sinYaw + pz * cosYaw;
          sphereX[i] = turnedX;
          sphereY[i] = py * cosPitch - turnedZ * sinPitch;
          sphereZ[i] = py * sinPitch + turnedZ * cosPitch;
          mask[i] = 1;
        }
      }
      this.mask = mask;

      for (var octave = 0; octave < this.OCTAVES; octave++) {
        var permutation = this.permutation(seed + Math.imul(octave + 1, 104729));
        var offsetX = 7.13 + octave * 11.71;
        var offsetY = -5.37 - octave * 13.17;
        var offsetZ = 3.91 + octave * 7.43;

        for (i = 0; i < count; i++) {
          if (!mask[i]) continue;
          cumulative[i] += amplitude * this.perlin(
              sphereX[i] * frequency + offsetX,
              sphereY[i] * frequency + offsetY,
              sphereZ[i] * frequency + offsetZ,
              permutation
            );
        }

        var stage = new Float32Array(count);
        for (i = 0; i < count; i++) {
          stage[i] = mask[i] ? cumulative[i] : this.OUTSIDE;
        }
        stages.push(stage);
        amplitude *= this.PERSISTENCE;
        frequency *= 2;
      }
      return stages;
    },
    seaLevel: function (field) {
      var sample = [];
      for (var i = 0; i < field.length; i += 13) {
        if (field[i] > this.OUTSIDE / 2) sample.push(field[i]);
      }
      sample.sort(function (a, b) { return a - b; });
      return sample[Math.floor((1 - this.LAND_FRACTION) * (sample.length - 1))];
    },
    init: function (s) {
      var size = this.SIZE;
      var buffer = document.createElement('canvas');
      buffer.width = buffer.height = size;
      var bctx = buffer.getContext('2d');
      if (!this.stages) this.stages = this.buildStages();
      var seaLevel = this.seaLevel(this.stages[this.stages.length - 1]);
      s.state = {
        age: 0,
        renderWait: 0,
        phase: 'draw',
        stages: this.stages,
        mask: this.mask,
        seaLevel: seaLevel,
        heights: new Float32Array(size * size),
        buffer: buffer,
        bctx: bctx,
        image: bctx.createImageData(size, size)
      };
      this.draw(s, 0);
    },
    draw: function (s, position) {
      var st = s.state;
      var size = this.SIZE;
      var heights = st.heights;
      var mask = st.mask;
      var data = st.image.data;
      var ink = this.rgb(s.ink);
      var lo = Math.min(st.stages.length - 1, Math.floor(position));
      var hi = Math.min(st.stages.length - 1, lo + 1);
      var mix = position - lo;
      var low = st.stages[lo], high = st.stages[hi];
      var i, x, y;

      for (i = 0; i < heights.length; i++) {
        heights[i] = low[i] + (high[i] - low[i]) * mix;
      }

      for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
          i = y * size + x;
          var p = i * 4;
          if (!mask[i]) {
            data[p] = ink[0];
            data[p + 1] = ink[1];
            data[p + 2] = ink[2];
            data[p + 3] = 0;
            continue;
          }

          var h = heights[i];
          var leftIndex = y * size + Math.max(0, x - 1);
          var rightIndex = y * size + Math.min(size - 1, x + 1);
          var upIndex = Math.max(0, y - 1) * size + x;
          var downIndex = Math.min(size - 1, y + 1) * size + x;
          var left = mask[leftIndex] ? heights[leftIndex] : h;
          var right = mask[rightIndex] ? heights[rightIndex] : h;
          var up = mask[upIndex] ? heights[upIndex] : h;
          var down = mask[downIndex] ? heights[downIndex] : h;
          var landHeight = h - st.seaLevel;
          var gradient = 0.5 * Math.hypot(right - left, down - up);
          var safeGradient = Math.max(gradient, 0.000001);
          var coverage = this.smooth(0.5 + landHeight / (1.1 * safeGradient));
          var tier = Math.min(
            this.TERRACE_ALPHA.length - 1,
            Math.floor(Math.max(0, landHeight) / this.TERRACE_STEP)
          );

          // Flat elevation terraces retain the height information without
          // turning the land into a diffuse, cloud-like texture.
          var alpha = this.OCEAN_ALPHA +
            coverage * (this.TERRACE_ALPHA[tier] - this.OCEAN_ALPHA);

          data[p] = ink[0];
          data[p + 1] = ink[1];
          data[p + 2] = ink[2];
          data[p + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
        }
      }

      st.bctx.clearRect(0, 0, size, size);
      st.bctx.putImageData(st.image, 0, 0);
      s.ctx.clearRect(0, 0, s.w, s.h);
      s.ctx.imageSmoothingEnabled = true;
      var side = 0.86 * Math.min(s.w, s.h);
      var cx = s.w / 2, cy = s.h / 2;
      s.ctx.save();
      s.ctx.beginPath();
      s.ctx.arc(cx, cy, side / 2, 0, 2 * Math.PI);
      s.ctx.clip();
      s.ctx.drawImage(st.buffer, cx - side / 2, cy - side / 2, side, side);
      s.ctx.restore();
      this.drawIsolines(s, heights, size, side, [st.seaLevel], 0.74, 0.9);
      s.ctx.save();
      s.ctx.beginPath();
      s.ctx.arc(cx, cy, side / 2, 0, 2 * Math.PI);
      s.ctx.strokeStyle = s.ink;
      s.ctx.globalAlpha = 0.24;
      s.ctx.lineWidth = 0.7;
      s.ctx.stroke();
      s.ctx.restore();
    },
    drawIsolines: function (s, heights, size, side, levels, alpha, width) {
      var ctx = s.ctx;
      var scale = side / (size - 1);

      function fraction(a, b, level) {
        var d = a - b;
        return d === 0 ? 0.5 : (a - level) / d;
      }

      ctx.save();
      ctx.translate((s.w - side) / 2, (s.h - side) / 2);
      ctx.scale(scale, scale);
      ctx.beginPath();

      for (var y = 0; y < size - 1; y++) {
        for (var x = 0; x < size - 1; x++) {
          var i = y * size + x;
          var tl = heights[i];
          var tr = heights[i + 1];
          var bl = heights[i + size];
          var br = heights[i + size + 1];
          if (
            tl <= this.OUTSIDE / 2 || tr <= this.OUTSIDE / 2 ||
            bl <= this.OUTSIDE / 2 || br <= this.OUTSIDE / 2
          ) continue;
          var minimum = Math.min(tl, tr, br, bl);
          var maximum = Math.max(tl, tr, br, bl);

          for (var l = 0; l < levels.length; l++) {
            var level = levels[l];
            if (level <= minimum || level >= maximum) continue;
            var code =
              (tl > level ? 1 : 0) |
              (tr > level ? 2 : 0) |
              (br > level ? 4 : 0) |
              (bl > level ? 8 : 0);

            var top = fraction(tl, tr, level);
            var right = fraction(tr, br, level);
            var bottom = fraction(bl, br, level);
            var left = fraction(tl, bl, level);
            var edgeX = [x + top, x + 1, x + bottom, x];
            var edgeY = [y, y + right, y + 1, y + left];
            var segments;

            switch (code) {
              case 1:  segments = [3, 0]; break;
              case 2:  segments = [0, 1]; break;
              case 3:  segments = [3, 1]; break;
              case 4:  segments = [1, 2]; break;
              case 5:
                segments = tl + tr + br + bl > 4 * level ? [0, 1, 2, 3] : [3, 0, 1, 2];
                break;
              case 6:  segments = [0, 2]; break;
              case 7:  segments = [3, 2]; break;
              case 8:  segments = [2, 3]; break;
              case 9:  segments = [0, 2]; break;
              case 10:
                segments = tl + tr + br + bl > 4 * level ? [3, 0, 1, 2] : [0, 1, 2, 3];
                break;
              case 11: segments = [1, 2]; break;
              case 12: segments = [1, 3]; break;
              case 13: segments = [0, 1]; break;
              case 14: segments = [3, 0]; break;
            }

            for (var j = 0; j < segments.length; j += 2) {
              var a = segments[j], b = segments[j + 1];
              ctx.moveTo(edgeX[a], edgeY[a]);
              ctx.lineTo(edgeX[b], edgeY[b]);
            }
          }
        }
      }

      ctx.strokeStyle = s.ink;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width / scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    },
    frame: function (s, dt) {
      var st = s.state;
      if (st.phase !== 'draw') return;
      st.age += dt;
      st.renderWait += dt;
      var last = st.stages.length - 1;
      if (st.renderWait >= 1 / 15) {
        st.renderWait = 0;
        var age = Math.min(st.age, this.DURATION);
        var progress = age / this.DURATION;
        this.draw(s, last * progress);
      }
      if (st.age >= this.DURATION) {
        this.draw(s, last);
        st.phase = 'done';
      }
    },
    still: function (s) {
      this.draw(s, s.state.stages.length - 1);
    }
  };

  // ---------- 7 · Rotating Perlin globe ----------
  // The same spherical fBm idea is precomputed as a global latitude-longitude
  // texture, then sampled through a turning orthographic sphere. The map forms
  // in octaves while the planet rotates and keeps turning once complete.
  var globeField = {
    SIZE: 320,
    TEXTURE_WIDTH: 768,
    TEXTURE_HEIGHT: 384,
    OCTAVES: 7,
    SEED: 18070830,
    BASE_FREQUENCY: 1.35,
    PERSISTENCE: 0.55,
    LAND_FRACTION: 0.31,
    TERRACE_STEP: 0.10,
    TERRACE_ALPHA: [20, 24, 29, 35, 42],
    OCEAN_ALPHA: 2,
    OUTSIDE: -1000,
    DURATION: 28,
    ROTATION_SPEED: 0.055,
    textures: null,

    buildTextures: function () {
      var width = this.TEXTURE_WIDTH;
      var height = this.TEXTURE_HEIGHT;
      var count = width * height;
      var pointX = new Float32Array(count);
      var pointY = new Float32Array(count);
      var pointZ = new Float32Array(count);
      var cumulative = new Float32Array(count);
      var textures = [];
      var amplitude = 1;
      var frequency = this.BASE_FREQUENCY;

      for (var y = 0; y < height; y++) {
        var latitude = Math.PI * (0.5 - y / (height - 1));
        var cosLatitude = Math.cos(latitude);
        var py = Math.sin(latitude);
        for (var x = 0; x < width; x++) {
          var longitude = 2 * Math.PI * (x / width - 0.5);
          var i = y * width + x;
          pointX[i] = cosLatitude * Math.cos(longitude);
          pointY[i] = py;
          pointZ[i] = cosLatitude * Math.sin(longitude);
        }
      }

      for (var octave = 0; octave < this.OCTAVES; octave++) {
        var permutation = heightmap.permutation(
          this.SEED + Math.imul(octave + 1, 104729)
        );
        var offsetX = 7.13 + octave * 11.71;
        var offsetY = -5.37 - octave * 13.17;
        var offsetZ = 3.91 + octave * 7.43;

        for (i = 0; i < count; i++) {
          cumulative[i] += amplitude * heightmap.perlin(
            pointX[i] * frequency + offsetX,
            pointY[i] * frequency + offsetY,
            pointZ[i] * frequency + offsetZ,
            permutation
          );
        }

        textures.push(new Float32Array(cumulative));
        amplitude *= this.PERSISTENCE;
        frequency *= 2;
      }
      return textures;
    },
    seaLevel: function (field) {
      var sample = [];
      for (var i = 0; i < field.length; i += 11) sample.push(field[i]);
      sample.sort(function (a, b) { return a - b; });
      return sample[Math.floor((1 - this.LAND_FRACTION) * (sample.length - 1))];
    },
    buildProjection: function () {
      var size = this.SIZE;
      var count = size * size;
      var longitudeX = new Float32Array(count);
      var row0 = new Uint32Array(count);
      var row1 = new Uint32Array(count);
      var latitudeMix = new Float32Array(count);
      var pointZ = new Float32Array(count);
      var mask = new Uint8Array(count);
      var cosPitch = Math.cos(heightmap.PITCH);
      var sinPitch = Math.sin(heightmap.PITCH);

      for (var y = 0; y < size; y++) {
        var sy = 2 * y / (size - 1) - 1;
        for (var x = 0; x < size; x++) {
          var sx = 2 * x / (size - 1) - 1;
          var radiusSquared = sx * sx + sy * sy;
          var i = y * size + x;
          if (radiusSquared > 1) continue;
          var px = sx;
          var py = -sy;
          var pz = Math.sqrt(1 - radiusSquared);
          var worldY = py * cosPitch - pz * sinPitch;
          var worldZ = py * sinPitch + pz * cosPitch;
          var u = Math.atan2(worldZ, px) / (2 * Math.PI) + 0.5;
          var v = 0.5 -
            Math.asin(Math.max(-1, Math.min(1, worldY))) / Math.PI;
          var gy = Math.max(
            0,
            Math.min(this.TEXTURE_HEIGHT - 1, v * (this.TEXTURE_HEIGHT - 1))
          );
          var y0 = Math.floor(gy);
          longitudeX[i] = u * this.TEXTURE_WIDTH;
          row0[i] = y0 * this.TEXTURE_WIDTH;
          row1[i] = Math.min(this.TEXTURE_HEIGHT - 1, y0 + 1) *
            this.TEXTURE_WIDTH;
          latitudeMix[i] = gy - y0;
          pointZ[i] = pz;
          mask[i] = 1;
        }
      }
      return {
        longitudeX: longitudeX,
        row0: row0,
        row1: row1,
        latitudeMix: latitudeMix,
        z: pointZ,
        mask: mask
      };
    },
    init: function (s) {
      if (!this.textures) this.textures = this.buildTextures();
      var projection = this.buildProjection();
      var size = this.SIZE;
      var buffer = document.createElement('canvas');
      buffer.width = buffer.height = size;
      var bctx = buffer.getContext('2d');
      s.state = {
        age: 0,
        yaw: 0,
        renderWait: 0,
        textures: this.textures,
        seaLevel: this.seaLevel(this.textures[this.textures.length - 1]),
        longitudeX: projection.longitudeX,
        row0: projection.row0,
        row1: projection.row1,
        latitudeMix: projection.latitudeMix,
        pointZ: projection.z,
        mask: projection.mask,
        heights: new Float32Array(size * size),
        buffer: buffer,
        bctx: bctx,
        image: bctx.createImageData(size, size)
      };
      this.draw(s, 0);
    },
    draw: function (s, position) {
      var st = s.state;
      var size = this.SIZE;
      var mask = st.mask;
      var heights = st.heights;
      var data = st.image.data;
      var ink = heightmap.rgb(s.ink);
      var lo = Math.min(st.textures.length - 1, Math.floor(position));
      var hi = Math.min(st.textures.length - 1, lo + 1);
      var mix = position - lo;
      var low = st.textures[lo], high = st.textures[hi];
      var width = this.TEXTURE_WIDTH;
      var longitudeShift = -(heightmap.YAW + st.yaw) /
        (2 * Math.PI) * width;
      var i, x, y;

      for (i = 0; i < heights.length; i++) {
        if (!mask[i]) {
          heights[i] = this.OUTSIDE;
          continue;
        }
        var gx = st.longitudeX[i] + longitudeShift;
        var x0 = Math.floor(gx);
        var tx = gx - x0;
        x0 = (x0 % width + width) % width;
        var x1 = (x0 + 1) % width;
        var row0 = st.row0[i];
        var row1 = st.row1[i];
        var ty = st.latitudeMix[i];
        var lowTop = low[row0 + x0] +
          (low[row0 + x1] - low[row0 + x0]) * tx;
        var lowBottom = low[row1 + x0] +
          (low[row1 + x1] - low[row1 + x0]) * tx;
        var highTop = high[row0 + x0] +
          (high[row0 + x1] - high[row0 + x0]) * tx;
        var highBottom = high[row1 + x0] +
          (high[row1 + x1] - high[row1 + x0]) * tx;
        var a = lowTop + (lowBottom - lowTop) * ty;
        var b = highTop + (highBottom - highTop) * ty;
        heights[i] = a + (b - a) * mix;
      }

      for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
          i = y * size + x;
          var p = i * 4;
          if (!mask[i]) {
            data[p] = ink[0];
            data[p + 1] = ink[1];
            data[p + 2] = ink[2];
            data[p + 3] = 0;
            continue;
          }

          var h = heights[i];
          var leftIndex = y * size + Math.max(0, x - 1);
          var rightIndex = y * size + Math.min(size - 1, x + 1);
          var upIndex = Math.max(0, y - 1) * size + x;
          var downIndex = Math.min(size - 1, y + 1) * size + x;
          var left = mask[leftIndex] ? heights[leftIndex] : h;
          var right = mask[rightIndex] ? heights[rightIndex] : h;
          var up = mask[upIndex] ? heights[upIndex] : h;
          var down = mask[downIndex] ? heights[downIndex] : h;
          var landHeight = h - st.seaLevel;
          var dx = right - left;
          var dy = down - up;
          var gradient = 0.5 * Math.sqrt(dx * dx + dy * dy);
          var safeGradient = Math.max(gradient, 0.000001);
          var coverage = heightmap.smooth(0.5 + landHeight / (1.1 * safeGradient));
          var tier = Math.min(
            this.TERRACE_ALPHA.length - 1,
            Math.floor(Math.max(0, landHeight) / this.TERRACE_STEP)
          );
          // A very slight darkening towards the limb makes the projection
          // read as volume without returning to the old fog-like shading.
          var limb = 3 * (1 - st.pointZ[i]);
          var alpha = this.OCEAN_ALPHA + limb +
            coverage * (this.TERRACE_ALPHA[tier] - this.OCEAN_ALPHA);

          data[p] = ink[0];
          data[p + 1] = ink[1];
          data[p + 2] = ink[2];
          data[p + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
        }
      }

      st.bctx.clearRect(0, 0, size, size);
      st.bctx.putImageData(st.image, 0, 0);
      s.ctx.clearRect(0, 0, s.w, s.h);
      s.ctx.imageSmoothingEnabled = true;
      var side = 0.86 * Math.min(s.w, s.h);
      var cx = s.w / 2, cy = s.h / 2;
      s.ctx.save();
      s.ctx.beginPath();
      s.ctx.arc(cx, cy, side / 2, 0, 2 * Math.PI);
      s.ctx.clip();
      s.ctx.drawImage(st.buffer, cx - side / 2, cy - side / 2, side, side);
      s.ctx.restore();
      heightmap.drawIsolines(
        s, heights, size, side, [st.seaLevel], 0.74, 0.9
      );
      s.ctx.save();
      s.ctx.beginPath();
      s.ctx.arc(cx, cy, side / 2, 0, 2 * Math.PI);
      s.ctx.strokeStyle = s.ink;
      s.ctx.globalAlpha = 0.24;
      s.ctx.lineWidth = 0.7;
      s.ctx.stroke();
      s.ctx.restore();
    },
    progress: function (age) {
      return Math.min(1, age / this.DURATION);
    },
    frame: function (s, dt) {
      var st = s.state;
      st.age = Math.min(this.DURATION, st.age + dt);
      st.yaw = (st.yaw + dt * this.ROTATION_SPEED) % (2 * Math.PI);
      st.renderWait += dt;
      if (st.renderWait >= 1 / 15) {
        st.renderWait = 0;
        this.draw(s, (st.textures.length - 1) * this.progress(st.age));
      }
    },
    still: function (s) {
      s.state.age = this.DURATION;
      s.state.yaw = 0;
      this.draw(s, s.state.textures.length - 1);
    }
  };

  // The gallery piece uses one WebGL renderer at 60 fps. The CPU code above
  // supplies its deterministic height field but is never selected as a
  // lower-performance runtime fallback.
  var globe = {
    DURATION: 28,
    ROTATION_SPEED: 0.055,
    FPS: 60,
    packedTexture: null,

    vertexSource: [
      'attribute vec2 aPosition;',
      'void main() {',
      '  gl_Position = vec4(aPosition, 0.0, 1.0);',
      '}'
    ].join('\n'),

    fragmentSource: [
      '#extension GL_OES_standard_derivatives : enable',
      '#extension GL_EXT_shader_texture_lod : enable',
      'precision highp float;',
      'uniform sampler2D uLowHeight;',
      'uniform sampler2D uHighHeight;',
      'uniform vec2 uResolution;',
      'uniform vec2 uUvScale;',
      'uniform vec2 uUvOffset;',
      'uniform vec3 uInk;',
      'uniform vec3 uPaper;',
      'uniform float uStageMix;',
      'uniform float uDetail;',
      'uniform float uYaw;',
      'uniform float uSeaLevel;',
      'uniform float uTerraceStep;',
      'const float PI = 3.141592653589793;',
      'const float TWO_PI = 6.283185307179586;',
      '',
      'float terraceAlpha(float landHeight) {',
      '  float tier = floor(max(0.0, landHeight) / uTerraceStep);',
      '  if (tier < 1.0) return 20.0 / 255.0;',
      '  if (tier < 2.0) return 24.0 / 255.0;',
      '  if (tier < 3.0) return 29.0 / 255.0;',
      '  if (tier < 4.0) return 35.0 / 255.0;',
      '  return 42.0 / 255.0;',
      '}',
      '',
      'float decodeHeight(vec4 sampleValue) {',
      '  return sampleValue.r + (sampleValue.g - 0.5) / 255.0;',
      '}',
      '',
      'void main() {',
      '  float side = 0.86 * min(uResolution.x, uResolution.y);',
      '  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / (0.5 * side);',
      '  float radiusSquared = dot(p, p);',
      '  float radialWidth = max(fwidth(radiusSquared), 0.0001);',
      '  if (radiusSquared > 1.0 + radialWidth) {',
      '    gl_FragColor = vec4(0.0);',
      '    return;',
      '  }',
      '',
      '  float z = sqrt(max(0.0, 1.0 - radiusSquared));',
      '  float cosPitch = cos(0.32);',
      '  float sinPitch = sin(0.32);',
      '  float worldY = p.y * cosPitch - z * sinPitch;',
      '  float worldZ = p.y * sinPitch + z * cosPitch;',
      '  float longitude = atan(worldZ, p.x) / TWO_PI + 0.5 - uYaw / TWO_PI;',
      '  float latitude = 0.5 - asin(clamp(worldY, -1.0, 1.0)) / PI;',
      '  vec2 uv = vec2(fract(longitude), clamp(latitude, 0.0, 1.0));',
      '  uv = uUvOffset + uv * uUvScale;',
      '  float lod = clamp(log2(1.0 / max(z, 0.035)), 0.0, 5.0);',
      '',
      '  float low = decodeHeight(texture2DLodEXT(uLowHeight, uv, lod));',
      '  float high = decodeHeight(texture2DLodEXT(uHighHeight, uv, lod));',
      '  float height = mix(low, high, uStageMix);',
      '',
      '  float landHeight = height - uSeaLevel;',
      '  vec2 fieldGradient = vec2(dFdx(height), dFdy(height));',
      '  float gradientSize = max(length(fieldGradient), 1.0 / 65535.0);',
      '  float coastDistance = landHeight / gradientSize;',
      '  float land = smoothstep(-0.75, 0.75, coastDistance);',
      '',
      '  float earlyInk = pow(1.0 - clamp(uDetail, 0.0, 1.0), 1.5);',
      '  float broadPressure = 0.5 + 0.5 * sin(',
      '    TWO_PI * (2.0 * longitude + 0.85 * latitude) + 0.65',
      '  );',
      '  float finePressure = 0.5 + 0.5 * sin(',
      '    TWO_PI * (-11.0 * longitude + 3.10 * latitude)',
      '    - 1.10 + 1.25 * broadPressure',
      '  );',
      '  float inkPressure = smoothstep(',
      '    0.08, 0.92, 0.60 * broadPressure + 0.40 * finePressure',
      '  );',
      '  float widthPressure = mix(',
      '    1.0, mix(0.56, 1.52, inkPressure), earlyInk',
      '  );',
      '  float haloPressure = mix(',
      '    1.0, mix(0.72, 1.35, inkPressure), earlyInk',
      '  );',
      '  float brushDensity = 0.55 * inkPressure + 0.45 * finePressure;',
      '  float densityPressure = mix(',
      '    1.0, mix(0.74, 1.14, brushDensity), earlyInk',
      '  );',
      '  float coreWidth = mix(0.62, 1.55, earlyInk) * widthPressure;',
      '  float haloWidth = mix(0.90, 3.10, earlyInk) * haloPressure;',
      '  float strokeAA = clamp(',
      '    0.70 * fwidth(coastDistance),',
      '    mix(0.55, 1.00, earlyInk),',
      '    1.35',
      '  );',
      '  float coastCore = 1.0 - smoothstep(',
      '    coreWidth - strokeAA, coreWidth + strokeAA, abs(coastDistance)',
      '  );',
      '  float coastHalo = 1.0 - smoothstep(',
      '    coreWidth, coreWidth + haloWidth, abs(coastDistance)',
      '  );',
      '  float coastAlpha = max(',
      '    coastCore * 0.68 * densityPressure,',
      '    coastHalo * mix(0.08, 0.30, earlyInk) * densityPressure',
      '  );',
      '',
      '  float oceanAlpha = (2.0 + 3.0 * (1.0 - z)) / 255.0;',
      '  float fillAlpha = mix(',
      '    oceanAlpha, terraceAlpha(landHeight) + 3.0 * (1.0 - z) / 255.0, land',
      '  );',
      '  float rim = 1.0 - smoothstep(',
      '    0.18 * radialWidth, 1.25 * radialWidth, abs(1.0 - radiusSquared)',
      '  );',
      '  float sphereCoverage = 1.0 - smoothstep(',
      '    1.0 - radialWidth, 1.0 + radialWidth, radiusSquared',
      '  );',
      '  float alpha = max(fillAlpha, coastAlpha);',
      '  alpha = max(alpha, rim * 0.24);',
      '  vec3 colour = mix(uPaper, uInk, clamp(alpha, 0.0, 1.0));',
      '  gl_FragColor = vec4(colour * sphereCoverage, sphereCoverage);',
      '}'
    ].join('\n'),

    prepareTexture: function () {
      if (this.packedTexture) return this.packedTexture;
      var textures = globeField.buildTextures();
      var count = textures[0].length;
      var minimum = Infinity;
      var maximum = -Infinity;
      var layer, i;
      for (layer = 0; layer < textures.length; layer++) {
        for (i = 0; i < count; i++) {
          minimum = Math.min(minimum, textures[layer][i]);
          maximum = Math.max(maximum, textures[layer][i]);
        }
      }

      var range = Math.max(0.000001, maximum - minimum);
      var sourceWidth = globeField.TEXTURE_WIDTH;
      var sourceHeight = globeField.TEXTURE_HEIGHT;
      var atlasWidth = 1024;
      var atlasHeight = 512;
      var padX = (atlasWidth - sourceWidth) / 2;
      var padY = (atlasHeight - sourceHeight) / 2;
      var atlasCount = atlasWidth * atlasHeight;
      var bytesPerPixel = 4;
      var layerSize = atlasCount * bytesPerPixel;
      var data = new Uint8Array(layerSize * textures.length);
      var sourceX = new Uint16Array(atlasWidth);
      var sourceRow = new Uint32Array(atlasHeight);
      var x, y;
      for (x = 0; x < atlasWidth; x++) {
        sourceX[x] = (x - padX + sourceWidth) % sourceWidth;
      }
      for (y = 0; y < atlasHeight; y++) {
        sourceRow[y] = Math.max(
          0,
          Math.min(sourceHeight - 1, y - padY)
        ) * sourceWidth;
      }
      for (layer = 0; layer < textures.length; layer++) {
        var offset = layer * layerSize;
        var field = textures[layer];
        for (y = 0; y < atlasHeight; y++) {
          var row = offset + y * atlasWidth * bytesPerPixel;
          var fieldRow = sourceRow[y];
          for (x = 0; x < atlasWidth; x++) {
            var value = Math.max(
              0,
              Math.min(1, (field[fieldRow + sourceX[x]] - minimum) / range)
            );
            var coarse = Math.round(value * 255);
            var residual = value - coarse / 255;
            var fine = Math.round((residual * 255 + 0.5) * 255);
            var pixel = row + x * bytesPerPixel;
            data[pixel] = coarse;
            data[pixel + 1] = Math.max(0, Math.min(255, fine));
            data[pixel + 2] = 0;
            data[pixel + 3] = 255;
          }
        }
      }

      var seaLevel = globeField.seaLevel(textures[textures.length - 1]);
      this.packedTexture = {
        data: data,
        width: atlasWidth,
        height: atlasHeight,
        layers: textures.length,
        layerSize: layerSize,
        uvScale: [
          (sourceWidth - 1) / atlasWidth,
          (sourceHeight - 1) / atlasHeight
        ],
        uvOffset: [
          (padX + 0.5) / atlasWidth,
          (padY + 0.5) / atlasHeight
        ],
        seaLevel: (seaLevel - minimum) / range,
        terraceStep: globeField.TERRACE_STEP / range
      };
      return this.packedTexture;
    },

    compileShader: function (gl, type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Globe shader failed');
      }
      return shader;
    },

    createProgram: function (gl) {
      var vertex = this.compileShader(gl, gl.VERTEX_SHADER, this.vertexSource);
      var fragment = this.compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentSource);
      var program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Globe program failed');
      }
      return program;
    },

    initGPU: function (s) {
      var canvas = document.getElementById('globe-webgl');
      if (!canvas) throw new Error('Globe WebGL canvas is missing');
      canvas.width = s.el.width;
      canvas.height = s.el.height;
      var contextOptions = {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      };
      var gl = canvas.getContext('webgl', contextOptions) ||
        canvas.getContext('experimental-webgl', contextOptions);
      if (!gl) throw new Error('WebGL is unavailable');
      if (!gl.getExtension('OES_standard_derivatives')) {
        throw new Error('WebGL derivatives are unavailable');
      }
      if (!gl.getExtension('EXT_shader_texture_lod')) {
        throw new Error('WebGL texture filtering is unavailable');
      }
      // Low-alpha coastline halos are smoother without framebuffer stippling.
      gl.disable(gl.DITHER);
      var packed = this.prepareTexture();

      var program = this.createProgram(gl);
      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );
      var position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      var heightTextures = [];
      for (var layer = 0; layer < packed.layers; layer++) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          packed.width,
          packed.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          packed.data.subarray(
            layer * packed.layerSize,
            (layer + 1) * packed.layerSize
          )
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        heightTextures.push(texture);
      }

      s.state = {
        renderer: 'gpu',
        age: 0,
        yaw: 0,
        renderWait: 0,
        canvas: canvas,
        gl: gl,
        program: program,
        vertexBuffer: vertexBuffer,
        position: position,
        textures: heightTextures,
        packed: packed,
        uniforms: {
          lowHeight: gl.getUniformLocation(program, 'uLowHeight'),
          highHeight: gl.getUniformLocation(program, 'uHighHeight'),
          resolution: gl.getUniformLocation(program, 'uResolution'),
          uvScale: gl.getUniformLocation(program, 'uUvScale'),
          uvOffset: gl.getUniformLocation(program, 'uUvOffset'),
          ink: gl.getUniformLocation(program, 'uInk'),
          paper: gl.getUniformLocation(program, 'uPaper'),
          stageMix: gl.getUniformLocation(program, 'uStageMix'),
          detail: gl.getUniformLocation(program, 'uDetail'),
          yaw: gl.getUniformLocation(program, 'uYaw'),
          seaLevel: gl.getUniformLocation(program, 'uSeaLevel'),
          terraceStep: gl.getUniformLocation(program, 'uTerraceStep')
        }
      };
      if (!canvas._globeContextHandlers) {
        canvas._globeContextHandlers = true;
        canvas.addEventListener('webglcontextlost', function (event) {
          event.preventDefault();
          s.state.renderer = 'lost';
        });
        canvas.addEventListener('webglcontextrestored', function () {
          s.state = {};
          globe.init(s);
          if (mqStill.matches) globe.still(s);
        });
      }
      this.drawGPU(s, 0);
      var glError = gl.getError();
      if (glError !== gl.NO_ERROR) {
        throw new Error('WebGL setup failed with error ' + glError);
      }
    },

    init: function (s) {
      if (s.state.renderer === 'gpu') {
        s.state.canvas.width = s.el.width;
        s.state.canvas.height = s.el.height;
        s.state.age = 0;
        s.state.yaw = 0;
        s.state.renderWait = 0;
        this.drawGPU(s, 0);
        return;
      }
      try {
        this.initGPU(s);
      } catch (error) {
        s.state = { renderer: 'failed' };
        console.warn('Unable to initialise the globe renderer:', error);
        s.ctx.fillStyle = s.ink;
        s.ctx.globalAlpha = 0.55;
        s.ctx.font = '15px system-ui, sans-serif';
        s.ctx.textAlign = 'center';
        s.ctx.fillText('The globe renderer could not start', s.w / 2, s.h / 2 - 10);
        s.ctx.font = '12px system-ui, sans-serif';
        var reason = String(error.message || error).split('\n')[0].slice(0, 100);
        s.ctx.fillText(reason, s.w / 2, s.h / 2 + 14);
        s.ctx.globalAlpha = 1;
      }
    },

    drawGPU: function (s, stage) {
      var st = s.state;
      var gl = st.gl;
      var ink = heightmap.rgb(s.ink);
      var paper = heightmap.rgb(s.paper);
      var width = st.canvas.width;
      var height = st.canvas.height;
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(st.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, st.vertexBuffer);
      gl.enableVertexAttribArray(st.position);
      gl.vertexAttribPointer(st.position, 2, gl.FLOAT, false, 0, 0);
      var lowerLayer = Math.min(
        st.packed.layers - 1,
        Math.floor(stage)
      );
      var upperLayer = Math.min(st.packed.layers - 1, lowerLayer + 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, st.textures[lowerLayer]);
      gl.uniform1i(st.uniforms.lowHeight, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, st.textures[upperLayer]);
      gl.uniform1i(st.uniforms.highHeight, 1);
      gl.uniform2f(st.uniforms.resolution, width, height);
      gl.uniform2f(
        st.uniforms.uvScale,
        st.packed.uvScale[0],
        st.packed.uvScale[1]
      );
      gl.uniform2f(
        st.uniforms.uvOffset,
        st.packed.uvOffset[0],
        st.packed.uvOffset[1]
      );
      gl.uniform3f(
        st.uniforms.ink,
        ink[0] / 255,
        ink[1] / 255,
        ink[2] / 255
      );
      gl.uniform3f(
        st.uniforms.paper,
        paper[0] / 255,
        paper[1] / 255,
        paper[2] / 255
      );
      gl.uniform1f(st.uniforms.stageMix, stage - lowerLayer);
      gl.uniform1f(
        st.uniforms.detail,
        stage / Math.max(1, st.packed.layers - 1)
      );
      gl.uniform1f(st.uniforms.yaw, heightmap.YAW + st.yaw);
      gl.uniform1f(st.uniforms.seaLevel, st.packed.seaLevel);
      gl.uniform1f(st.uniforms.terraceStep, st.packed.terraceStep);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    progress: function (age) {
      return Math.min(1, age / this.DURATION);
    },

    frame: function (s, dt) {
      if (s.state.renderer !== 'gpu') return;
      var st = s.state;
      st.age = Math.min(this.DURATION, st.age + dt);
      st.yaw = (st.yaw + dt * this.ROTATION_SPEED) % (2 * Math.PI);
      st.renderWait += dt;
      if (st.renderWait + 0.001 < 1 / this.FPS) return;
      st.renderWait = Math.max(0, st.renderWait - 1 / this.FPS);
      this.drawGPU(
        s,
        (st.packed.layers - 1) * this.progress(st.age)
      );
    },

    still: function (s) {
      if (s.state.renderer !== 'gpu') return;
      s.state.age = this.DURATION;
      s.state.yaw = 0;
      this.drawGPU(s, s.state.packed.layers - 1);
    }
  };

  // ---------- Archived · Tesseract (inactive) ----------
  // The 16 vertices and 32 edges of a 4-cube, rotated in the x–w and y–z
  // planes at incommensurate speeds, projected 4D → 3D → 2D. Edges nearer
  // in the fourth dimension are drawn darker.
  var tesseract = {
    W_XW: 0.055,  // radians per second, x–w plane
    W_YZ: 0.038,  // radians per second, y–z plane
    D4: 3,        // 4D → 3D viewing distance
    D3: 12,       // 3D → 2D viewing distance
    TILT_X: 0.42,
    TILT_Y: 0.58,
    verts: null,
    edges: null,
    init: function (s) {
      s.state = { t: 6 };  // start mid-turn so the first frame is already oblique
      if (!this.edges) {
        this.verts = [];
        this.edges = [];
        var i, j;
        for (i = 0; i < 16; i++) {
          this.verts.push([(i & 1) * 2 - 1, (i >> 1 & 1) * 2 - 1, (i >> 2 & 1) * 2 - 1, (i >> 3 & 1) * 2 - 1]);
        }
        for (i = 0; i < 16; i++) {
          for (j = i + 1; j < 16; j++) {
            var x = i ^ j;
            if ((x & (x - 1)) === 0) this.edges.push([i, j]);  // differ in one coordinate
          }
        }
      }
    },
    draw: function (s) {
      var ctx = s.ctx, st = s.state;
      ctx.clearRect(0, 0, s.w, s.h);
      var a = st.t * this.W_XW, b = st.t * this.W_YZ;
      var ca = Math.cos(a), sa = Math.sin(a);
      var cb = Math.cos(b), sb = Math.sin(b);
      var cX = Math.cos(this.TILT_X), sX = Math.sin(this.TILT_X);
      var cY = Math.cos(this.TILT_Y), sY = Math.sin(this.TILT_Y);
      var scale = 0.125 * Math.min(s.w, s.h);
      var D4 = this.D4, D3 = this.D3;

      var proj = new Array(16);
      for (var i = 0; i < 16; i++) {
        var v = this.verts[i];
        // turn in the x–w and y–z planes
        var x1 = v[0] * ca - v[3] * sa, w1 = v[0] * sa + v[3] * ca;
        var y1 = v[1] * cb - v[2] * sb, z1 = v[1] * sb + v[2] * cb;
        // 4D → 3D perspective
        var s4 = D4 / (D4 - w1);
        var X = x1 * s4, Y = y1 * s4, Z = z1 * s4;
        // fixed viewing tilt in 3D
        var X2 = X * cY + Z * sY, Z2 = -X * sY + Z * cY;
        var Y2 = Y * cX - Z2 * sX, Z3 = Y * sX + Z2 * cX;
        // 3D → 2D perspective
        var s3 = D3 / (D3 - Z3);
        proj[i] = { x: s.w / 2 + X2 * s3 * scale, y: s.h / 2 + Y2 * s3 * scale, s: s4 };
      }

      ctx.strokeStyle = s.ink;
      ctx.lineWidth = 0.9;
      for (var e = 0; e < this.edges.length; e++) {
        var p = proj[this.edges[e][0]], q = proj[this.edges[e][1]];
        // nearer in the fourth dimension → darker (s4 runs ~0.68 … 1.9)
        ctx.globalAlpha = 0.16 + 0.42 * ((p.s + q.s) / 2 - 0.68) / 1.22;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    frame: function (s, dt) {
      s.state.t += dt;
      this.draw(s);
    },
    still: function (s) {
      this.draw(s);
    }
  };

  // ---------- boot ----------
  makeSketch('phyllotaxis', phyllotaxis);
  makeSketch('harmonograph', harmonograph);
  makeSketch('voxels', voxels);
  makeSketch('clifford', clifford);
  // Archived terrain comparisons:
  // makeSketch('terrain', terrain);
  // makeSketch('heightmap', heightmap);
  makeSketch('globe', globe);
  // Preserved for possible return: makeSketch('tesseract', tesseract);

  var last = null;
  function loop(ts) {
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.1);
    last = ts;
    if (!mqStill.matches && !document.hidden) {
      sketches.forEach(function (s) {
        if (s.visible && s.initialized) {
          s.impl.frame(s, dt);
        }
      });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Restart on theme change (toggle or OS) so ink is redrawn in the new colour.
  new MutationObserver(restartAll)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (mqDark.addEventListener) mqDark.addEventListener('change', restartAll);
  if (mqStill.addEventListener) mqStill.addEventListener('change', restartAll);

  // Refit on real width changes only (mobile URL-bar scrolling fires resize too).
  var resizeTimer = null;
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { sketches.forEach(fit); }, 150);
  });
})();
