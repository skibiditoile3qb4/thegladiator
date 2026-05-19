// ════════════════════════════════════════════════════════════════
//  CAMPAIGN MODE — Gladiator Arena
//  Shares the same script scope as index.html — all `let` globals
//  (currentMatch, myHealth, oppHealth, isShielding, etc.) are
//  directly accessible by name. Do NOT use window.X for those vars.
// ════════════════════════════════════════════════════════════════

const CampaignMode = (() => {

  // ── STORY DATA ──────────────────────────────────────────────
  const CHAPTERS = [
    {
      id: 0,
      title: 'The Pits of Karthon',
      enemy: {
        name: 'Grak the Unclean',
        title: 'Sewer Champion',
        elo: 650,
        color: '#6b7280',
        emoji: '🪓',
        description: 'A hulking brute who fights dirty — charges straight and swings wild. Zero finesse.',
        diff: 'easy',
      },
      intro: [
        'You wake in chains beneath the coliseum.',
        'The crowd above roars. A cell door grinds open.',
        'Your first opponent shambles forward — Grak the Unclean, the sewer champion.',
        '"Fresh meat," he growls. "Won\'t even feel it."',
      ],
      victory: '"How—" Grak rasps, collapsing. A gate lifts. The crowd wants more.',
      defeat: 'Grak drags you back to your cell. "Tomorrow," he sneers. "We try again."',
    },
    {
      id: 1,
      title: "The Merchant's Gambit",
      enemy: {
        name: 'Silara Vex',
        title: 'Blade for Hire',
        elo: 1100,
        color: '#8b5cf6',
        emoji: '🗡️',
        description: 'A contract killer who times her strikes. She reads your charge meter and dashes on crits.',
        diff: 'medium',
      },
      intro: [
        'The merchant Dorvus paid for a show.',
        'His fighter, Silara Vex, emerges in violet silks — daggers spinning.',
        '"Nothing personal," she says with a smile that doesn\'t reach her eyes.',
        '"It\'s just coin."',
      ],
      victory: "Silara sheathes her blades, bows to Dorvus, and walks out. Professionals don't hold grudges.",
      defeat: '"Stay down," Silara murmurs. "Next time I won\'t stop."',
    },
    {
      id: 2,
      title: 'Son of the Sand',
      enemy: {
        name: 'Duras Ashborn',
        title: 'Desert Warlord',
        elo: 1800,
        color: '#f59e0b',
        emoji: '⚔️',
        description: 'A veteran who keeps distance, waits for your shield to drop, then punishes with full charges.',
        diff: 'hard',
      },
      intro: [
        'Three victories. The crowd knows your name now.',
        'Duras Ashborn crossed three deserts to fight the rising champion.',
        'He says nothing. He drops his cloak.',
        'Underneath: a body that is entirely scar tissue.',
      ],
      victory: 'Duras sits on the arena sand, breathing slowly. "Good," he says. Just that.',
      defeat: 'He stands over you, hand extended. "Learn from this. Or don\'t. Doesn\'t matter to the sand."',
    },
    {
      id: 3,
      title: 'The Iron Throne',
      enemy: {
        name: 'EMPEROR MALACHAR',
        title: 'The Undying',
        elo: 3800,
        color: '#dc2626',
        emoji: '👑',
        description: 'The undefeated emperor. Shield always up, strikes only on your mistakes, frame-perfect counters.',
        diff: 'boss',
      },
      intro: [
        'The coliseum falls silent.',
        'Emperor Malachar has not fought in seven years. He did not need to.',
        'He descends from the imperial box in full armor, unhurried.',
        '"I have buried thirty-one champions," he says, voice calm as winter.',
        '"You will be thirty-two. There is no dishonor in it."',
        'He raises his shield before you even move.',
      ],
      victory: 'The emperor kneels. The crowd erupts. You are the first. The only.\n\n"THE ARENA IS YOURS."',
      defeat: '"Thirty-two," Malachar says quietly, and walks back to his throne.\n\nYou will be back.',
    },
  ];

  // ── MODULE STATE ─────────────────────────────────────────────
  let currentChapter     = 0;
  let savedProgress      = parseInt(localStorage.getItem('gladCampaignProgress') || '0');
  let overlay            = null;
  let bossState          = 'shielding';
  let bossStateTimer     = 0;
  let bossLastPunishTime = 0;
  let _bossRAFInjected   = false;

  // ── PUBLIC API ────────────────────────────────────────────────
  function open() {
    currentChapter = savedProgress;
    showCampaignMenu();
  }

  // ── CAMPAIGN MENU ─────────────────────────────────────────────
  function showCampaignMenu() {
    removeOverlay();
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:100vw;height:100vh;',
      'background:rgba(0,0,0,0.92);z-index:1000;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'overflow-y:auto;padding:40px 20px;box-sizing:border-box;gap:0;',
    ].join('');

    const hdr = document.createElement('div');
    hdr.style.cssText = 'text-align:center;margin-bottom:32px;';
    hdr.innerHTML = [
      '<div style="font-size:13px;letter-spacing:4px;color:#888;margin-bottom:8px;">GLADIATOR ARENA</div>',
      '<div style="font-size:40px;font-weight:900;',
      'background:linear-gradient(135deg,#ff4500,#ffd700);',
      '-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;">',
      'CAMPAIGN MODE</div>',
      '<div style="font-size:13px;color:#555;">Four battles. One throne.</div>',
    ].join('');
    overlay.appendChild(hdr);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:100%;max-width:520px;';

    CHAPTERS.forEach(function(ch, i) {
      var unlocked  = i <= savedProgress;
      var completed = i < savedProgress;
      var card = document.createElement('div');
      card.style.cssText = [
        'background:' + (completed ? '#1a2a1a' : unlocked ? '#1a1a2a' : '#111') + ';',
        'border:2px solid ' + (completed ? '#4ade80' : unlocked ? '#ffd700' : '#2a2a2a') + ';',
        'border-radius:12px;padding:18px 22px;',
        'cursor:' + (unlocked ? 'pointer' : 'not-allowed') + ';',
        'transition:all 0.2s;display:flex;align-items:center;gap:16px;',
        'opacity:' + (unlocked ? '1' : '0.45') + ';',
      ].join('');
      if (unlocked) {
        card.onmouseenter = function() { card.style.transform = 'scale(1.02)'; };
        card.onmouseleave = function() { card.style.transform = 'scale(1)'; };
        card.onclick = (function(idx) { return function() { startChapter(idx); }; })(i);
      }
      var badge = completed ? '✅' : unlocked ? ch.enemy.emoji : '🔒';
      card.innerHTML = [
        '<div style="font-size:32px;min-width:48px;text-align:center;">' + badge + '</div>',
        '<div style="flex:1;">',
        '<div style="font-size:11px;letter-spacing:2px;color:#888;margin-bottom:2px;">',
        'CHAPTER ' + (i + 1) + ' — ' + (unlocked ? (completed ? 'COMPLETE' : 'AVAILABLE') : 'LOCKED') + '</div>',
        '<div style="font-size:18px;font-weight:bold;color:' + (unlocked ? '#fff' : '#555') + ';margin-bottom:2px;">',
        ch.title + '</div>',
        '<div style="font-size:13px;color:' + (completed ? '#4ade80' : unlocked ? '#ffd700' : '#555') + ';">',
        'vs ' + ch.enemy.name + (unlocked ? ' · ' + ch.enemy.elo + ' ELO' : '') + '</div>',
        unlocked ? '<div style="font-size:11px;color:#666;margin-top:4px;">' + ch.enemy.description + '</div>' : '',
        '</div>',
        (i === savedProgress && !completed) ? '<div style="font-size:22px;">▶</div>' : '',
      ].join('');
      grid.appendChild(card);
    });
    overlay.appendChild(grid);

    var backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lobby';
    backBtn.style.cssText = [
      'margin-top:28px;padding:12px 32px;background:transparent;',
      'border:1px solid #444;border-radius:8px;color:#888;font-size:14px;cursor:pointer;transition:all 0.2s;',
    ].join('');
    backBtn.onmouseenter = function() { backBtn.style.borderColor = '#ef4444'; backBtn.style.color = '#ef4444'; };
    backBtn.onmouseleave = function() { backBtn.style.borderColor = '#444';    backBtn.style.color = '#888'; };
    backBtn.onclick = function() { removeOverlay(); };
    overlay.appendChild(backBtn);
    document.body.appendChild(overlay);
  }

  // ── CHAPTER INTRO ─────────────────────────────────────────────
  function startChapter(idx) {
    currentChapter = idx;
    var ch = CHAPTERS[idx];
    removeOverlay();
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:1000;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'padding:40px;box-sizing:border-box;',
    ].join('');

    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:600px;text-align:center;width:100%;';
    inner.innerHTML = [
      '<div style="font-size:11px;letter-spacing:4px;color:#555;margin-bottom:16px;">CHAPTER ' + (idx + 1) + '</div>',
      '<div style="font-size:32px;font-weight:900;color:#fff;margin-bottom:8px;">' + ch.title + '</div>',
      '<div style="font-size:14px;color:#888;margin-bottom:36px;letter-spacing:1px;">',
      ch.enemy.emoji + ' ' + ch.enemy.name + ' — ' + ch.enemy.title + '</div>',
      '<div id="introLines" style="margin-bottom:36px;min-height:120px;"></div>',
      '<button id="fightBtn" style="display:none;padding:18px 56px;',
      'background:linear-gradient(135deg,#b91c1c,#7f1d1d);',
      'border:2px solid #ef4444;border-radius:8px;',
      'color:#fff;font-size:22px;font-weight:900;cursor:pointer;letter-spacing:2px;transition:all 0.2s;">',
      'ENTER THE ARENA</button>',
      '<button id="skipBtn" style="display:block;margin:16px auto 0;padding:8px 24px;',
      'background:transparent;border:1px solid #333;border-radius:6px;',
      'color:#555;font-size:13px;cursor:pointer;">Skip intro</button>',
    ].join('');
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    var linesEl  = inner.querySelector('#introLines');
    var fightBtn = inner.querySelector('#fightBtn');
    var skipBtn  = inner.querySelector('#skipBtn');

    fightBtn.onmouseenter = function() { fightBtn.style.transform = 'scale(1.05)'; };
    fightBtn.onmouseleave = function() { fightBtn.style.transform = 'scale(1)'; };

    var lineIdx = 0, charIdx = 0;
    var iv = setInterval(function() {
      if (lineIdx >= ch.intro.length) {
        clearInterval(iv);
        fightBtn.style.display = 'inline-block';
        skipBtn.style.display  = 'none';
        return;
      }
      var line = ch.intro[lineIdx];
      var span = linesEl.children[lineIdx];
      if (!span) {
        span = document.createElement('div');
        span.style.cssText = 'color:#ccc;font-size:16px;line-height:2;min-height:32px;';
        linesEl.appendChild(span);
      }
      if (charIdx < line.length) {
        span.textContent = line.slice(0, ++charIdx);
      } else { charIdx = 0; lineIdx++; }
    }, 28);

    skipBtn.onclick = function() {
      clearInterval(iv);
      linesEl.innerHTML = '';
      ch.intro.forEach(function(l) {
        var d = document.createElement('div');
        d.style.cssText = 'color:#ccc;font-size:16px;line-height:2;';
        d.textContent = l;
        linesEl.appendChild(d);
      });
      fightBtn.style.display = 'inline-block';
      skipBtn.style.display  = 'none';
    };

    fightBtn.onclick = function() { removeOverlay(); launchCampaignBattle(ch); };
  }

  // ── BATTLE LAUNCH ─────────────────────────────────────────────
  function launchCampaignBattle(ch) {
    var enemy = ch.enemy;

    // Reset boss state
    bossState          = 'shielding';
    bossStateTimer     = 0;
    bossLastPunishTime = 0;

    // Write into the SHARED `currentMatch` let-variable from index.html.
    // Because both files run in the same page script scope, we use the
    // bare name — NOT window.currentMatch (let vars don't attach to window).
    currentMatch = {
      opponent:    enemy.name,
      opponentId:  'campaign_bot_' + Date.now(),
      opponentElo: enemy.elo,
      isBot:       true,
      botDiff:     enemy.diff,   // 'easy' | 'medium' | 'hard' | 'boss'
      isCampaign:  true,
      chapterIdx:  ch.id,
    };

    showScreen('battleScreen');
    initBattle();

    // Restyle the enemy element after initBattle creates it
    setTimeout(function() {
      var opp = players.get(currentMatch.opponentId);
      if (!opp || !opp.element) return;
      opp.element.style.background = enemy.color;
      opp.element.innerHTML = enemy.emoji;
      var nameTag = document.createElement('div');
      nameTag.className   = 'player-name';
      nameTag.textContent = enemy.name;
      opp.element.appendChild(nameTag);
      var hbar = document.createElement('div');
      hbar.className = 'health-bar';
      hbar.innerHTML = '<div class="health-fill"></div><div class="health-text">100/100</div>';
      opp.element.appendChild(hbar);
      var shieldIco = document.createElement('div');
      shieldIco.className   = 'shield-icon';
      shieldIco.textContent = '🛡️';
      opp.element.appendChild(shieldIco);
    }, 80);

    if (enemy.diff === 'boss') injectBossRAF();
  }

  // ── BOSS RAF INJECTION ────────────────────────────────────────
  function injectBossRAF() {
    if (_bossRAFInjected) return;
    _bossRAFInjected = true;
    var origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(cb) {
      return origRAF(function(ts) {
        cb(ts);
        if (currentMatch && currentMatch.botDiff === 'boss') {
          var opp = players.get(currentMatch.opponentId);
          var me  = players.get(clientId);
          if (opp && me && opp.isBot) {
            updateBotCharge(opp);
            bossBot(opp, me);
          }
        }
      });
    };
  }

  // ── BOSS AI: EMPEROR MALACHAR ─────────────────────────────────
  function bossBot(boss, player) {
    if (!currentMatch) return;
    var now = Date.now();
    var dx  = player.x - boss.x;
    var dy  = player.y - boss.y;
    var mag = Math.sqrt(dx * dx + dy * dy) || 1;
    var d   = mag;

    // Read shared globals by bare name
    var playerCharge    = meterCharge;
    var playerShielding = isShielding || shieldRaising;
    var playerJustSwung = (now - myLastAttackTime) < PARRY_WINDOW_MS;

    // Always shield unless punishing
    if (bossState !== 'punishing') {
      if (!boss.isShielding && !boss.shieldRaising) cBotRaiseShield(boss);
    }

    if (bossState === 'shielding') {
      var ideal      = 110;
      var orbitAngle = Math.sin(now / 900) * 0.8;
      var tx = player.x - Math.cos(orbitAngle) * ideal;
      var ty = player.y - Math.sin(orbitAngle) * ideal;

      if (d > ideal + 30) {
        cBotMove(boss, tx, ty, PLAYER_SPEED * 0.6);
      } else if (d < ideal - 30) {
        cBotMove(boss, boss.x - (dx / mag) * PLAYER_SPEED * 0.5,
                       boss.y - (dy / mag) * PLAYER_SPEED * 0.5);
      } else {
        var ox   = -dy / mag, oy = dx / mag;
        var side = Math.sin(now / 1200) > 0 ? 1 : -1;
        cBotMove(boss, boss.x + ox * side * 1.2, boss.y + oy * side * 1.2, 1.2);
      }

      // Dodge sideways on incoming crit
      if (playerCharge >= 92 && d < 100 && boss.dashReady) {
        var ox2   = -dy / mag, oy2 = dx / mag;
        var side2 = Math.random() > 0.5 ? 1 : -1;
        cBotDash(boss, boss.x + ox2 * side2 * DASH_DISTANCE * 0.8,
                       boss.y + oy2 * side2 * DASH_DISTANCE * 0.8);
      }

      // Punish: player just swung
      if (playerJustSwung && d < ATTACK_RANGE + 35 && (now - bossLastPunishTime) > 800) {
        enterPunish(boss, player, now);
      }

      // Punish: player unshielded, low charge, boss fully charged
      if (!playerShielding && playerCharge < 30 && boss.charge >= 88
          && d <= ATTACK_RANGE + 15 && (now - bossLastPunishTime) > 1200) {
        enterPunish(boss, player, now);
      }

    } else if (bossState === 'punishing') {
      if (d > ATTACK_RANGE) cBotMove(boss, player.x, player.y, PLAYER_SPEED * 1.5);
      if (d <= ATTACK_RANGE && boss.charge >= 60 && boss.canAttack) {
        cBotAttack(boss, player);
        bossLastPunishTime = now;
        bossState      = 'retreating';
        bossStateTimer = now + 700;
        setTimeout(function() { if (boss) cBotRaiseShield(boss); }, 180);
      }
      if (now > bossStateTimer + 1500) {
        bossState = 'shielding';
        cBotRaiseShield(boss);
      }

    } else if (bossState === 'retreating') {
      var safeD = 150;
      if (d < safeD) {
        cBotMove(boss, boss.x - (dx / mag) * PLAYER_SPEED,
                       boss.y - (dy / mag) * PLAYER_SPEED, PLAYER_SPEED * 0.9);
      }
      if (!boss.isShielding && !boss.shieldRaising) cBotRaiseShield(boss);
      if (now > bossStateTimer || d >= safeD) bossState = 'shielding';
    }

    // Emergency re-shield
    if (!boss.isShielding && !boss.shieldRaising && bossState !== 'punishing') {
      cBotRaiseShield(boss);
    }
  }

  function enterPunish(boss, player, now) {
    bossState      = 'punishing';
    bossStateTimer = now;
    cBotLowerShield(boss);
    var dx  = player.x - boss.x, dy = player.y - boss.y;
    var d   = Math.sqrt(dx * dx + dy * dy);
    var mag = d || 1;
    if (d > ATTACK_RANGE + 20 && boss.dashReady) {
      cBotDash(boss, boss.x + (dx / mag) * (d - ATTACK_RANGE + 8),
                     boss.y + (dy / mag) * (d - ATTACK_RANGE + 8));
    }
  }

  // ── PRIVATE BOT HELPERS ───────────────────────────────────────
  function cBotMove(bot, tx, ty, speed) {
    speed = speed !== undefined ? speed : PLAYER_SPEED;
    var dx  = tx - bot.x, dy = ty - bot.y;
    var mag = Math.sqrt(dx * dx + dy * dy) || 1;
    var maxX = window.innerWidth / 2 - 60, maxY = window.innerHeight / 2 - 100;
    var nx = bot.x + (dx / mag) * speed, ny = bot.y + (dy / mag) * speed;
    if (Math.abs(nx) < maxX) bot.x = nx;
    if (Math.abs(ny) < maxY) bot.y = ny;
    setPlayerPos(bot.element, bot.x, bot.y);
  }

  function cBotRaiseShield(bot) {
    if (bot.isShielding || bot.shieldRaising) return;
    bot.shieldRaising = true;
    setTimeout(function() {
      if (!bot || !bot.element) return;
      bot.shieldRaising = false;
      bot.isShielding   = true;
      bot.element.classList.add('shielding');
    }, SHIELD_RAISE_MS);
  }

  function cBotLowerShield(bot) {
    bot.shieldRaising = false;
    bot.isShielding   = false;
    if (bot.element) bot.element.classList.remove('shielding');
  }

  function cBotDash(bot, tx, ty) {
    if (!bot.dashReady) return;
    var maxX = window.innerWidth / 2 - 60, maxY = window.innerHeight / 2 - 100;
    var cx = bot.x, cy = bot.y;
    for (var i = 0; i < 4; i++) {
      (function(bx, by) { setTimeout(function() { makeAfterimage(bx, by, '#dc2626'); }, i * 20); })(cx, cy);
    }
    bot.x = Math.max(-maxX, Math.min(maxX, tx));
    bot.y = Math.max(-maxY, Math.min(maxY, ty));
    setPlayerPos(bot.element, bot.x, bot.y);
    bot.dashReady = false;
    setTimeout(function() { if (bot) bot.dashReady = true; }, DASH_COOLDOWN_MS);
  }
  function updateBotCharge(bot) {
  if (!bot.canAttack) { bot.lastCharge = Date.now(); return; }
  var now = Date.now();
  if (!bot.lastCharge) bot.lastCharge = now;
  var dt = now - bot.lastCharge;
  bot.charge = Math.min(100, (bot.charge || 0) + (dt / ATTACK_CHARGE_MS) * 100);
  bot.lastCharge = now;
}

  function cBotAttack(bot, player) {
    if (!bot.canAttack || bot.isShielding) return;
    var now     = Date.now();
    var damage  = bot.charge >= 90 ? 25 : bot.charge < 10 ? 1 : Math.floor(bot.charge / 100 * 25);
    var hitType = bot.charge >= 90 ? 'critical' : bot.charge < 10 ? 'weak' : 'normal';

    showSwordSwing(bot.element);

    // Clash check — bare names from index.html scope
    var inClash = (now - myLastAttackTime) < PARRY_WINDOW_MS
      && !isShielding && !shieldRaising && myLastSwingPower > 0;

    if (inClash) {
      var diff = myLastSwingPower - damage;
      myLastSwingPower = 0;
      cShowParryEffect(player.element);
      if (diff >= 0) {
        var clashDmg = Math.max(1, diff);
        oppHealth    = Math.max(0, oppHealth - clashDmg);
        bot.health   = oppHealth;
        updateHealth(bot.element, oppHealth);
        showDamageNum(clashDmg, 'parry', bot.element);
        if (oppHealth <= 0 && currentMatch) { endMatch(true, false); return; }
      } else {
        var clashDmg2 = Math.max(1, Math.abs(diff));
        myHealth      = Math.max(0, myHealth - clashDmg2);
        player.health = myHealth;
        updateHealth(player.element, myHealth);
        showDamageNum(clashDmg2, hitType, player.element);
        myLastHitTime = now;
        if (myHealth <= 0 && currentMatch) { endMatch(false, false); return; }
      }
      bot.canAttack = false; bot.charge = 0;
      setTimeout(function() { if (bot) bot.canAttack = true; }, 200);
      return;
    }

    var finalDamage = damage;
    if (isShielding) {
      finalDamage = Math.max(1, Math.floor(damage * 0.5));
      showDamageNum(finalDamage, 'blocked', player.element);
    } else {
      showDamageNum(finalDamage, hitType, player.element);
      myLastHitTime = now;
    }
    myHealth      = Math.max(0, myHealth - finalDamage);
    player.health = myHealth;
    updateHealth(player.element, myHealth);
    bot.charge = 0; bot.canAttack = false;
    setTimeout(function() { if (bot) bot.canAttack = true; }, 200);
    if (myHealth <= 0 && currentMatch) endMatch(false, false);
  }

  function cShowParryEffect(targetEl) {
    var r     = targetEl.getBoundingClientRect();
    var label = document.createElement('div');
    label.className   = 'damage-number dmg-parry';
    label.textContent = '⚡PARRY';
    label.style.left  = (r.left + r.width / 2) + 'px';
    label.style.top   = r.top + 'px';
    document.body.appendChild(label);
    setTimeout(function() { label.remove(); }, 900);
  }

  // ── POST-MATCH INTERCEPT ──────────────────────────────────────
  // `endMatch` in index.html is a function DECLARATION, so it IS on
  // window. We wrap it after a tick to ensure it's fully parsed.
  function hookEndMatch() {
    var origFn = window.endMatch;
    window.endMatch = function(won, disconnected) {
      if (currentMatch && currentMatch.isCampaign) {
        var chIdx = currentMatch.chapterIdx;
        // Suppress the results screen, let campaign show its own
        var origShow = window.showScreen;
        window.showScreen = function() {};
        origFn.call(this, won, disconnected);
        window.showScreen = origShow;
        showCampaignResult(won, chIdx);
      } else {
        origFn.call(this, won, disconnected);
      }
    };
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────
  function showCampaignResult(won, chapterIdx) {
    var ch = CHAPTERS[chapterIdx];
    if (won && chapterIdx >= savedProgress) {
      savedProgress = chapterIdx + 1;
      localStorage.setItem('gladCampaignProgress', savedProgress);
    }

    document.querySelectorAll('.player,.dash-afterimage,.sword-swing,.damage-number,.parry-flash')
      .forEach(function(e) { e.remove(); });

    setTimeout(function() {
      removeOverlay();
      overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed;top:0;left:0;width:100vw;height:100vh;',
        'background:rgba(0,0,0,0.95);z-index:1000;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'gap:20px;padding:40px;box-sizing:border-box;text-align:center;',
      ].join('');

      var isLast   = chapterIdx === CHAPTERS.length - 1;
      var bigMsg   = won ? (isLast ? '⚔️ THE ARENA IS YOURS ⚔️' : '🏆 VICTORY') : '💀 DEFEATED';
      var color    = won ? '#4ade80' : '#ef4444';
      var showNext = won && savedProgress < CHAPTERS.length;

      overlay.innerHTML = [
        '<div style="font-size:11px;letter-spacing:4px;color:#555;">' + ch.title.toUpperCase() + '</div>',
        '<div style="font-size:48px;font-weight:900;color:' + color + ';line-height:1.1;">' + bigMsg + '</div>',
        '<div style="max-width:500px;font-size:16px;color:#aaa;line-height:1.8;white-space:pre-line;">',
        (won ? ch.victory : ch.defeat) + '</div>',
        showNext ? '<div style="font-size:13px;color:#ffd700;">Chapter ' + (savedProgress + 1) + ' unlocked!</div>' : '',
        '<div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;justify-content:center;">',
        showNext ? [
          '<button id="nextChBtn" style="padding:16px 40px;',
          'background:linear-gradient(135deg,#b91c1c,#7f1d1d);',
          'border:2px solid #ef4444;border-radius:8px;',
          'color:#fff;font-size:18px;font-weight:bold;cursor:pointer;letter-spacing:1px;">',
          'NEXT CHAPTER ▶</button>',
        ].join('') : '',
        '<button id="retryBtn" style="padding:16px 40px;',
        'background:transparent;border:2px solid #ffd700;border-radius:8px;',
        'color:#ffd700;font-size:18px;font-weight:bold;cursor:pointer;">',
        (won ? '🔁 REPLAY' : '⚔️ TRY AGAIN') + '</button>',
        '<button id="mapBtn" style="padding:16px 40px;',
        'background:transparent;border:2px solid #444;border-radius:8px;',
        'color:#888;font-size:18px;font-weight:bold;cursor:pointer;">',
        'CAMPAIGN MAP</button>',
        '</div>',
      ].join('');
      document.body.appendChild(overlay);

      var nextBtn = overlay.querySelector('#nextChBtn');
      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          removeOverlay();
          showScreen('lobbyScreen');
          setTimeout(function() { startChapter(chapterIdx + 1); }, 100);
        });
      }
      overlay.querySelector('#retryBtn').addEventListener('click', function() {
        removeOverlay();
        showScreen('lobbyScreen');
        setTimeout(function() { startChapter(chapterIdx); }, 100);
      });
      overlay.querySelector('#mapBtn').addEventListener('click', function() {
        showScreen('lobbyScreen');
        showCampaignMenu();
      });
    }, 600);
  }

  // ── UTILITY ───────────────────────────────────────────────────
  function removeOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  // Defer hook by one tick so index.html function declarations are ready
  setTimeout(hookEndMatch, 0);

  return { open: open };

})();
