// Home page shell: a small fake terminal with history, Tab completion and a
// "help" that types itself the first time the section scrolls into view.
(function () {
  var term = document.querySelector('.term');
  if (!term) return;
  var out = term.querySelector('.term-out');
  var form = term.querySelector('.term-line');
  var input = form.querySelector('input');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CV = term.dataset.cv, CONTACT = term.dataset.contact;
  var GH = 'https://github.com/Aransok';

  var projects = [
    ['broffice', 'Broffice: office-supplies e-commerce, live at broffice.bg', 'https://broffice.bg'],
    ['crewbase', 'Crewbase: team platform with routes for drivers (private beta)', null],
    ['vektor', 'VEKTOR Auto Parts: 3D car you take apart to pick a part (in development)', null],
    ['ember', 'Project Ember: hardcore one-hand RPG for Android (closed beta soon)', null],
    ['bytebits', 'ByteBits: a YouTube channel that runs itself', 'https://www.youtube.com/@ByteBits-y3b'],
    ['agents-office', 'AI Agents Office: a company made of agents, pure Python (in development)', null],
    ['pocket-linux', 'Pocket Linux: a Linux desktop on your phone, no root (in development)', GH + '/pocketlinux-x11'],
    ['listings', 'Property Listings Generator: 5 databases in, translated PDF out', GH + '/JsonBulgarianDataToAINumericData'],
    ['pdf-chat', 'Simple PDF Chat: ask questions about any PDF, Bulgarian OCR', null],
    ['portfolio', 'This portfolio: Django, three.js, no frameworks on the front', GH + '/Portfolio-website']
  ];

  var cmds = {
    help: function () {
      return [
        ['whoami', 'who you are talking to'],
        ['stack', 'tools I ship with'],
        ['projects', 'things I built (ls works too)'],
        ['open <name>', 'open a project'],
        ['cv', 'download my CV'],
        ['github', 'my GitHub'],
        ['hire', 'start a conversation'],
        ['clear', 'clean the screen']
      ].map(function (r) { return '<b>' + pad(r[0], 13) + '</b>' + r[1]; }).join('\n');
    },
    whoami: function () {
      return 'Doan Idriz, full-stack and AI automation engineer in Plovdiv, Bulgaria.\n' +
        'I build agents from plain Python: no LangChain, no CrewAI, just code I can debug.';
    },
    stack: function () {
      return [
        ['backend', 'Python, Django, REST APIs, OAuth 2.0, Celery, Redis'],
        ['frontend', 'React, TypeScript'],
        ['data', 'PostgreSQL, Pinecone, RAG'],
        ['ai', 'AI agents, LLM pipelines, N8N'],
        ['ops', 'Docker, Terraform, CI/CD']
      ].map(function (r) { return '<span class="t-k">' + pad(r[0], 10) + '</span>' + r[1]; }).join('\n');
    },
    projects: function () {
      return projects.map(function (p) { return '<b>' + pad(p[0], 16) + '</b>' + p[1]; }).join('\n') +
        '\n<span class="t-dim">open &lt;name&gt; to visit one</span>';
    },
    open: function (arg) {
      var p = projects.filter(function (x) { return x[0] === arg; })[0];
      if (!p) return 'open: which one? try <b>projects</b>';
      if (!p[2]) return p[0] + ': no public link yet, ask me for a demo';
      window.open(p[2], '_blank', 'noopener');
      return 'opening ' + link(p[2], p[2]);
    },
    cv: function () { return 'here you go: ' + link(CV, 'Doan_Idriz_CV_ATS.pdf', true); },
    github: function () { window.open(GH, '_blank', 'noopener'); return 'opening ' + link(GH, 'github.com/Aransok'); },
    hire: function () {
      setTimeout(function () { window.location.href = CONTACT; }, 900);
      return '<span class="t-ok">great choice.</span> taking you to the contact form...';
    },
    clear: function () { out.innerHTML = ''; return null; },
    sudo: function () { return 'nice try. you are not in the sudoers file. this incident will be reported to Doan.'; },
    rm: function (arg) { return arg.indexOf('-rf') === 0 ? 'permission denied: this portfolio is load-bearing' : 'rm: refusing'; },
    exit: function () { return 'there is no exit. only <b>hire</b>.'; },
    cat: function (arg) {
      if (arg === '.crewbase') {
        return '<span class="t-warn">ACCESS RESTRICTED</span>  crewbase is in private beta.\n' +
          'members only. present your crew badge:  <b>badge &lt;id&gt;</b>\n' +
          '<span class="t-dim">every crew member wears one. walk the museum, look closer at the second room.</span>';
      }
      if (arg === 'readme' || arg === 'README.md') return 'there is more here than <b>ls</b> shows.';
      return arg ? 'cat: ' + esc(arg) + ': no such file' : 'cat: give me a file';
    },
    badge: function (arg) {
      var id = (arg || '').toUpperCase().replace(/\s+/g, '');
      if (!id) return 'badge: which one? <b>badge &lt;id&gt;</b>';
      if (id !== 'NW-0042' && id !== 'NW0042') {
        return '<span class="t-warn">denied.</span> ' + esc(id) + ' is not on the crew list.';
      }
      unlock();
      return null;
    }
  };
  function unlock() {
    var lines = [
      ['<span class="t-dim">verifying badge NW-0042 ...</span>', 0],
      ['crew member: Mira Petrova · driver · van 1', 500],
      ['clearance: <span class="t-ok">granted</span>', 900],
      ['mounting /vault/crewbase ...', 1300],
      ['<span class="t-ok">welcome to the crew.</span>', 1900]
    ];
    form.hidden = true;
    lines.forEach(function (l) { setTimeout(function () { print(l[0]); }, reduce ? 0 : l[1]); });
    setTimeout(function () {
      form.hidden = false;
      try { localStorage.setItem('crew-badge', 'NW-0042'); } catch (e) {}
      if (window.openVault) window.openVault();
      else print('vault is offline. try again in a minute.');
    }, reduce ? 0 : 2500);
  }
  cmds.ls = function (arg) {
    if (/(^|\s)-\w*a/.test(arg || '')) {
      return '<b>.</b>  <b>..</b>  <span class="t-k">.crewbase</span>  README.md\n' + cmds.projects();
    }
    return cmds.projects();
  };
  cmds.contact = cmds.hire;
  var names = Object.keys(cmds);

  function pad(s, n) { while (s.length < n) s += ' '; return s.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function link(href, text, dl) {
    return '<a href="' + href + '"' + (dl ? ' download' : ' target="_blank" rel="noopener"') + '>' + esc(text) + '</a>';
  }
  function print(html, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  function run(raw) {
    var line = raw.trim();
    print('<span class="term-ps">doan@plovdiv:~$</span> ' + esc(line), 't-echo');
    if (!line) return;
    var parts = line.split(/\s+/), name = parts[0].toLowerCase(), arg = parts.slice(1).join(' ');
    var fn = cmds[name];
    var res = fn ? fn(arg) : 'command not found: ' + esc(name) + '. try <b>help</b>';
    if (res) print(res);
  }

  var history = [], at = 0;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value;
    if (v.trim()) history.push(v);
    at = history.length;
    input.value = '';
    run(v);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && at > 0) { at--; input.value = history[at]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { at = Math.min(history.length, at + 1); input.value = history[at] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      var v = input.value.toLowerCase(), list;
      if (/^open \S*$/.test(v)) {
        list = projects.map(function (p) { return 'open ' + p[0]; }).filter(function (n) { return n.indexOf(v) === 0; });
      } else {
        list = names.filter(function (n) { return n.indexOf(v) === 0; });
      }
      if (!v) return; // empty Tab keeps normal focus order
      e.preventDefault();
      if (list.length === 1) input.value = list[0] + (list[0] === 'open' ? ' ' : '');
      else if (list.length > 1) print(list.join('  '), 't-dim');
    }
  });
  term.addEventListener('click', function (e) {
    if (!e.target.closest('a') && !window.getSelection().toString()) input.focus({ preventScroll: true });
  });

  print('<span class="t-dim">Last login: today on ttys001. Welcome, recruiter.</span>');

  // types "help" once when the shell first shows up
  function intro() {
    if (reduce) { run('help'); return; }
    var word = 'help', i = 0;
    (function tick() {
      if (input.value.length !== i) return; // visitor started typing, back off
      input.value = word.slice(0, ++i);
      if (i < word.length) setTimeout(tick, 120);
      else setTimeout(function () { input.value = ''; run(word); }, 350);
    })();
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); setTimeout(intro, 400); }
    }, { threshold: 0.5 });
    io.observe(term);
  } else intro();
})();
