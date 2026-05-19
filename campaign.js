// ════════════════════════════════════════════════════════════════
//  CAMPAIGN MODE — Gladiator Arena
//  Hooks into index.html globals: players, clientId, currentMatch,
//  myHealth, oppHealth, myElo, myUsername, myWins, myLosses,
//  showScreen, initBattle, endMatch, ATTACK_RANGE, PLAYER_SPEED,
//  DASH_COOLDOWN_MS, DASH_DISTANCE, PARRY_WINDOW_MS, SHIELD_RAISE_MS
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
      title: 'The Merchant\'s Gambit',
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
      victory: 'Silara sheathes her blades, bows to Dorvus, and walks out. Professionals don\'t hold grudges.',
      defeat: 'A dagger at your throat. "Stay down," Silara murmurs. "Next time I won\'t stop."',
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
        diff: 'hard_lite',
      },
      intro: [
        'Three victories. The crowd knows your name now.',
        'Duras Ashborn crossed three deserts to fight the rising champion.',
        'He says nothing. He drops his cloak.',
        'Underneath: a body that is entirely scar tissue.',
      ],
      victory: 'Duras sits on the arena sand, breathing slowly. "Good," he says. Just that. Good.',
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
        description: 'The undefeated emperor. Fights perfectly — shield always up, strikes only on your crits, punishes aggression with frame-perfect counters.',
        diff: 'boss',
      },
      intro: [
        'The coliseum falls silent.',
        'Emperor Malachar has not fought in seven years. He didn\'t need to.',
        'He descends from the imperial box in full armor, unhurried.',
        '"I have buried thirty-one champions," he says, voice calm as winter.',
        '"You will be thirty-two. There is no dishonor in it."',
        'He raises his shield before you even move.',
      ],
      victory: 'The emperor kneels. The crowd erupts. You are the first. The only.\n\n"THE ARENA IS YOURS."',
      defeat: '"Thirty-two," Malachar says quietly, and walks back to his throne.\n\nYou will be back.',
    },
  ];

  // ── STATE ───────────────────────────────────────────────────
  let campaignOpen = false;
  let currentChapter = 0;
  let campaignWins = 0;
  let savedProgress = parseInt(localStorage.getItem('gladCampaignProgress') || '0');
  let overlay = null;
  let botLoop = null;

  // ── PUBLIC API ───────────────────────────────────────────────
  function open() {
    currentChapter = savedProgress;
    showCampaignMenu();
  }

  // ── CAMPAIGN MENU ────────────────────────────────────────────
  function showCampaignMenu() {
    removeOverlay();
    overlay = document.createElement('div');
    overlay.id = 'campaignOverlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.92);z-index:1000;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:0;overflow-y:auto;padding:40px 20px;box-sizing:border-box;
    `;

    const title = document.createElement('div');
    title.innerHTML = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:13px;letter-spacing:4px;color:#888;margin-bottom:8px;">GLADIATOR ARENA</div>
        <div style="font-size:40px;font-weight:900;background:linear-gradient(135deg,#ff4500,#ffd700);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;">
          CAMPAIGN MODE
        </div>
        <div style="font-size:13px;color:#555;">Four battles. One throne.</div>
      </div>
    `;
    overlay.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:100%;max-width:520px;';

    CHAPTERS.forEach((ch, i) => {
      const unlocked = i <= savedProgress;
      const completed = i < savedProgress;
      const card = document.createElement('div');
      card.style.cssText = `
        background:${completed ? '#1a2a1a' : unlocked ? '#1a1a2a' : '#111'};
        border:2px solid ${completed ? '#4ade80' : unlocked ? '#ffd700' : '#2a2a2a'};
        border-radius:12px;padding:18px 22px;cursor:${unlocked ? 'pointer' : 'not-allowed'};
        transition:all 0.2s;display:flex;align-items:center;gap:16px;
        opacity:${unlocked ? '1' : '0.45'};
      `;
      if (unlocked) {
        card.onmouseenter = () => card.style.transform = 'scale(1.02)';
        card.onmouseleave = () => card.style.transform = 'scale(1)';
        card.onclick = () => startChapter(i);
      }

      const badge = completed ? '✅' : unlocked ? ch.enemy.emoji : '🔒';
      card.innerHTML = `
        <div style="font-size:32px;min-width:48px;text-align:center;">${badge}</div>
        <div style="flex:1;">
          <div style="font-size:11px;letter-spacing:2px;color:#888;margin-bottom:2px;">
            CHAPTER ${i+1} — ${unlocked ? (completed ? 'COMPLETE' : 'AVAILABLE') : 'LOCKED'}
          </div>
          <div style="font-size:18px;font-weight:bold;color:${unlocked ? '#fff' : '#555'};margin-bottom:2px;">
            ${ch.title}
          </div>
          <div style="font-size:13px;color:${completed ? '#4ade80' : unlocked ? '#ffd700' : '#555'};">
            vs ${ch.enemy.name} ${unlocked ? '· ' + ch.enemy.elo + ' ELO' : ''}
          </div>
          ${unlocked ? `<div style="font-size:11px;color:#666;margin-top:4px;">${ch.enemy.description}</div>` : ''}
        </div>
        ${i === savedProgress && !completed ? '<div style="font-size:22px;">▶</div>' : ''}
      `;
      grid.appendChild(card);
    });

    overlay.appendChild(grid);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lobby';
    backBtn.style.cssText = `
      margin-top:28px;padding:12px 32px;background:transparent;
      border:1px solid #444;border-radius:8px;color:#888;font-size:14px;cursor:pointer;
      transition:all 0.2s;
    `;
    backBtn.onmouseenter = () => { backBtn.style.borderColor='#ef4444'; backBtn.style.color='#ef4444'; };
    backBtn.onmouseleave = () => { backBtn.style.borderColor='#444'; backBtn.style.color='#888'; };
    backBtn.onclick = () => { removeOverlay(); };
    overlay.appendChild(backBtn);

    document.body.appendChild(overlay);
  }

  // ── CHAPTER INTRO ────────────────────────────────────────────
  function startChapter(idx) {
    currentChapter = idx;
    const ch = CHAPTERS[idx];
    removeOverlay();
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:#000;z-index:1000;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:40px;box-sizing:border-box;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = 'max-width:600px;text-align:center;';

    inner.innerHTML = `
      <div style="font-size:11px;letter-spacing:4px;color:#555;margin-bottom:16px;">
        CHAPTER ${idx+1}
      </div>
      <div style="font-size:32px;font-weight:900;color:#fff;margin-bottom:8px;">${ch.title}</div>
      <div style="font-size:14px;color:#888;margin-bottom:36px;letter-spacing:1px;">
        ${ch.enemy.emoji} vs ${ch.enemy.name}, ${ch.enemy.title}
      </div>
      <div id="introLines" style="margin-bottom:36px;min-height:120px;"></div>
      <button id="fightBtn" style="
        display:none;padding:18px 56px;
        background:linear-gradient(135deg,#b91c1c,#7f1d1d);
        border:2px solid #ef4444;border-radius:8px;
        color:#fff;font-size:22px;font-weight:900;cursor:pointer;
        letter-spacing:2px;transition:all 0.2s;
      " onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">
        ENTER THE ARENA
      </button>
      <button id="skipIntroBtn" style="
        display:block;margin-top:16px;padding:8px 24px;
        background:transparent;border:1px solid #333;border-radius:6px;
        color:#555;font-size:13px;cursor:pointer;
      ">Skip intro</button>
    `;

    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    // Typewriter intro
    const linesEl = inner.querySelector('#introLines');
    const fightBtn = inner.querySelector('#fightBtn');
    const skipBtn  = inner.querySelector('#skipIntroBtn');

    let lineIdx = 0;
    let charIdx = 0;
    let typing = true;
    let interval;

    function typeNext() {
      if (lineIdx >= ch.intro.length) {
        clearInterval(interval);
        typing = false;
        fightBtn.style.display = 'inline-block';
        skipBtn.style.display = 'none';
        return;
      }
      const line = ch.intro[lineIdx];
      let span = linesEl.children[lineIdx];
      if (!span) {
        span = document.createElement('div');
        span.style.cssText = `color:#ccc;font-size:16px;line-height:2;min-height:32px;`;
        linesEl.appendChild(span);
      }
      if (charIdx < line.length) {
        span.textContent = line.slice(0, ++charIdx);
      } else {
        charIdx = 0;
        lineIdx++;
      }
    }
    interval = setInterval(typeNext, 28);

    skipBtn.onclick = () => {
      clearInterval(interval);
      linesEl.innerHTML = '';
      ch.intro.forEach(l => {
        const d = document.createElement('div');
        d.style.cssText = 'color:#ccc;font-size:16px;line-height:2;';
        d.textContent = l;
        linesEl.appendChild(d);
      });
      fightBtn.style.display = 'inline-block';
      skipBtn.style.display = 'none';
    };

    fightBtn.onclick = () => {
      removeOverlay();
      launchCampaignBattle(ch);
    };
  }

  // ── BATTLE SETUP ─────────────────────────────────────────────
  function launchCampaignBattle(ch) {
    const enemy = ch.enemy;

    // Patch into the main game's match system
    window.currentMatch = {
      opponent: enemy.name,
      opponentId: 'campaign_bot_' + Date.now(),
      opponentElo: enemy.elo,
      isBot: true,
      botDiff: enemy.diff,   // key: 'easy','medium','hard_lite','boss'
      isCampaign: true,
      chapterIdx: ch.id,
    };

    showScreen('battleScreen');
    initBattle();

    // Override opponent visuals
    setTimeout(() => {
      const opp = players.get(window.currentMatch.opponentId);
      if (opp) {
        opp.element.style.background = enemy.color;
        opp.element.textContent = enemy.emoji;
        // Re-append children that got wiped
        const nameTag = document.createElement('div');
        nameTag.className = 'player-name';
        nameTag.textContent = enemy.name;
        opp.element.appendChild(nameTag);
        const hbar = document.createElement('div');
        hbar.className = 'health-bar';
        hbar.innerHTML = '<div class="health-fill"></div><div class="health-text">100/100</div>';
        opp.element.appendChild(hbar);
        const shieldIco = document.createElement('div');
        shieldIco.className = 'shield-icon';
        shieldIco.textContent = '🛡️';
        opp.element.appendChild(shieldIco);
      }
    }, 80);

    // Inject campaign AI loop
    startCampaignAI(ch);
  }

  // ── CAMPAIGN AI ──────────────────────────────────────────────
  // This replaces the old bot* functions for campaign enemies.
  // It fires inside requestAnimationFrame-driven gameLoop via a
  // patched-in bot tick, triggered from the main gameLoop's
  // "if (opp && opp.isBot)" branch.
  // We hijack botDiff to route to our campaign AI functions.

  // The main game already calls updateBotCharge + diff routing in gameLoop.
  // We just need to define functions that match the expected names, OR we
  // override the routing by patching window-scope functions.

  function startCampaignAI(ch) {
    // Patch global bot routing for this match
    window._campaignChapter = ch;
    window._campaignAIActive = true;

    // Override the bot AI dispatcher used in gameLoop
    const origLoop = null; // we inject via the botDiff strings
    // The main gameLoop checks:
    //   if (opp.botDiff === 'easy')   easyBot(opp, me);
    //   if (opp.botDiff === 'medium') mediumBot(opp, me);
    //   if (opp.botDiff === 'hard')   hardBot(opp, me);
    // We inject new diff strings and override global functions:

    const diff = ch.enemy.diff;
    if (diff === 'easy') {
      // reuse existing easy bot — no override needed
    } else if (diff === 'medium') {
      // reuse existing medium bot
    } else if (diff === 'hard_lite') {
      // register as 'hard' but with gentled values
      window.currentMatch.botDiff = 'hard';
    } else if (diff === 'boss') {
      // Register custom diff string, patch gameLoop to call it
      window.currentMatch.botDiff = 'boss';
      // Inject boss into the main gameLoop
      injectBossIntoGameLoop();
    }
  }

  function injectBossIntoGameLoop() {
    // The main gameLoop calls hardBot for 'hard', but not 'boss'.
    // We monkey-patch the gameLoop function to add a boss branch.
    // Since gameLoop is defined in index.html scope, we override it via
    // a wrapper on window. We store original and wrap.
    if (window._bossInjected) return;
    window._bossInjected = true;

    // Inject bossBot into global scope so gameLoop can call it
    window.bossBot = bossBot;

    // Patch the check inside gameLoop — we can't rewrite it directly,
    // so we override via the fact that botDiff='boss' won't hit any existing
    // branch. We use MutationObserver trick: hook rAF.
    // Simpler: override requestAnimationFrame to run boss logic after each frame.
    const origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(cb) {
      return origRAF(function(ts) {
        cb(ts);
        if (window.currentMatch && window.currentMatch.botDiff === 'boss') {
          const opp = players.get(window.currentMatch.opponentId);
          const me  = players.get(clientId);
          if (opp && me && opp.isBot) {
            updateBotCharge(opp);
            bossBot(opp, me);
          }
        }
      });
    };
  }

  // ── BOSS AI: EMPEROR MALACHAR ─────────────────────────────────
  // Philosophy:
  // - Shield is almost always raised (90%+ of the time)
  // - Never drops shield unnecessarily — always has a reason
  // - Waits for player's crit window (meterCharge >= 82) → punishes
  // - Keeps medium distance: close enough to threaten, far enough to react
  // - After landing a hit → retreats to safe distance immediately
  // - Frame-perfect parry window exploitation: if player just attacked,
  //   Malachar counterattacks within 300ms
  // - Dash is used surgically: to close gaps for punishment or escape

  let bossState = 'shielding'; // 'shielding' | 'punishing' | 'retreating' | 'circling'
  let bossStateTimer = 0;
  let bossLastPunishTime = 0;
  let bossLastRetreatTime = 0;
  let bossCounterwindowOpen = false;

  function bossBot(boss, player) {
    if (!window.currentMatch) return;
    const now = Date.now();
    const d = dist2D(boss, player);
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;

    const playerCharge   = window.meterCharge || 0;
    const playerShielding = window.isShielding || window.shieldRaising;
    const playerJustSwung = (now - (window.myLastAttackTime || 0)) < PARRY_WINDOW_MS;

    // ── ALWAYS SHIELD unless actively punishing ──────────────
    if (bossState !== 'punishing') {
      if (!boss.isShielding && !boss.shieldRaising) {
        botRaiseShield(boss);
      }
    }

    // ── STATE MACHINE ────────────────────────────────────────
    switch (bossState) {

      case 'shielding': {
        // Ideal distance: 90-130px. Circle slowly.
        const ideal = 110;
        const orbitAngle = Math.sin(now / 900) * 0.8;
        const tx = player.x - Math.cos(orbitAngle) * ideal;
        const ty = player.y - Math.sin(orbitAngle) * ideal;

        if (d > ideal + 30) {
          botMove(boss, tx, ty, PLAYER_SPEED * 0.6);
        } else if (d < ideal - 30) {
          botMove(boss, boss.x - dx / mag * PLAYER_SPEED * 0.5, boss.y - dy / mag * PLAYER_SPEED * 0.5);
        } else {
          // Gentle orbit
          const ox = -dy / mag, oy = dx / mag;
          const side = Math.sin(now / 1200) > 0 ? 1 : -1;
          botMove(boss, boss.x + ox * side * 1.2, boss.y + oy * side * 1.2, 1.2);
        }

        // PUNISH TRIGGER 1: Player near full charge AND close
        if (playerCharge >= 82 && d < 130 && !playerShielding) {
          // Wait for player to swing, then counter — or dodge
          if (playerCharge >= 94 && boss.dashReady && d < 100) {
            // Dodge sideways at last moment
            const ox = -dy / mag, oy = dx / mag;
            const side = Math.random() > 0.5 ? 1 : -1;
            botDash(boss, boss.x + ox * side * DASH_DISTANCE * 0.8, boss.y + oy * side * DASH_DISTANCE * 0.8);
          }
        }

        // PUNISH TRIGGER 2: Player just swung (parry window)
        if (playerJustSwung && d < ATTACK_RANGE + 30 && (now - bossLastPunishTime) > 800) {
          enterPunishState(boss, player, now);
        }

        // PUNISH TRIGGER 3: Player has NO shield AND low charge AND Malachar has full charge
        if (!playerShielding && playerCharge < 30 && boss.charge >= 88 && d <= ATTACK_RANGE + 10
            && (now - bossLastPunishTime) > 1200) {
          enterPunishState(boss, player, now);
        }
        break;
      }

      case 'punishing': {
        // Lower shield, dash in, strike, then retreat
        // State is controlled by enterPunishState timeout
        if (d > ATTACK_RANGE) {
          botMove(boss, player.x, player.y, PLAYER_SPEED * 1.4);
        }
        if (d <= ATTACK_RANGE && boss.charge >= 60 && boss.canAttack) {
          // Frame-perfect strike
          botAttack(boss, player);
          bossLastPunishTime = now;
          bossState = 'retreating';
          bossStateTimer = now + 700;
          // Re-raise shield after striking
          setTimeout(() => { if (boss) botRaiseShield(boss); }, 200);
        }
        // Timeout safety — if we couldn't reach, go back to shielding
        if (now > bossStateTimer + 1500) {
          bossState = 'shielding';
          botRaiseShield(boss);
        }
        break;
      }

      case 'retreating': {
        // Back away to safe distance after hitting
        const safeD = 150;
        if (d < safeD) {
          botMove(boss, boss.x - dx / mag * PLAYER_SPEED, boss.y - dy / mag * PLAYER_SPEED, PLAYER_SPEED * 0.9);
        }
        // Keep shield up while retreating
        if (!boss.isShielding && !boss.shieldRaising) botRaiseShield(boss);

        if (now > bossStateTimer || d >= safeD) {
          bossState = 'shielding';
        }
        break;
      }
    }

    // EMERGENCY: If player just did full crit and boss is in range unshielded
    if (!boss.isShielding && !boss.shieldRaising && bossState !== 'punishing') {
      botRaiseShield(boss);
    }
  }

  function enterPunishState(boss, player, now) {
    bossState = 'punishing';
    bossStateTimer = now;
    // Drop shield for attack window
    botLowerShield(boss);
    // Dash in if far
    const d = dist2D(boss, player);
    if (d > ATTACK_RANGE + 20 && boss.dashReady) {
      const dx = player.x - boss.x, dy = player.y - boss.y;
      const mag = Math.sqrt(dx*dx+dy*dy)||1;
      botDash(boss, boss.x + dx/mag*(d-ATTACK_RANGE+10), boss.y + dy/mag*(d-ATTACK_RANGE+10));
    }
  }

  // ── POST-MATCH HOOK ──────────────────────────────────────────
  // We need to intercept endMatch to show campaign outcome.
  // Wrap window.endMatch.

  function hookEndMatch() {
    if (window._endMatchHooked) return;
    window._endMatchHooked = true;
    const orig = window.endMatch;
    window.endMatch = function(won, disconnected) {
      if (window.currentMatch && window.currentMatch.isCampaign) {
        // Clean up boss injection
        window._bossInjected = false;
        window._campaignAIActive = false;
        showCampaignResult(won, window.currentMatch.chapterIdx);
        // Still call original to do cleanup (stop intervals etc.)
        // but suppress the results screen
        const origShow = window.showScreen;
        window.showScreen = () => {}; // suppress
        orig.call(this, won, disconnected);
        window.showScreen = origShow;
      } else {
        orig.call(this, won, disconnected);
      }
    };
  }

  function showCampaignResult(won, chapterIdx) {
    const ch = CHAPTERS[chapterIdx];

    if (won && chapterIdx >= savedProgress) {
      savedProgress = chapterIdx + 1;
      localStorage.setItem('gladCampaignProgress', savedProgress);
    }

    // Cleanup arena
    document.querySelectorAll('.player, .dash-afterimage, .sword-swing, .damage-number, .parry-flash').forEach(e => e.remove());
    players.clear();

    setTimeout(() => {
      removeOverlay();
      overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:rgba(0,0,0,0.95);z-index:1000;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:20px;padding:40px;box-sizing:border-box;text-align:center;
      `;

      const isLastChapter = chapterIdx === CHAPTERS.length - 1;
      const bigMsg = won
        ? (isLastChapter ? '⚔️ THE ARENA IS YOURS ⚔️' : '🏆 VICTORY')
        : '💀 DEFEATED';
      const color = won ? '#4ade80' : '#ef4444';

      overlay.innerHTML = `
        <div style="font-size:11px;letter-spacing:4px;color:#555;">${ch.title.toUpperCase()}</div>
        <div style="font-size:48px;font-weight:900;color:${color};line-height:1.1;">${bigMsg}</div>
        <div style="max-width:500px;font-size:16px;color:#aaa;line-height:1.8;white-space:pre-line;">
          ${won ? ch.victory : ch.defeat}
        </div>
        ${won && savedProgress < CHAPTERS.length ? `
          <div style="font-size:13px;color:#ffd700;margin-top:4px;">
            Chapter ${savedProgress + 1} unlocked!
          </div>
        ` : ''}
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;justify-content:center;">
          ${won && savedProgress < CHAPTERS.length ? `
            <button id="nextChBtn" style="padding:16px 40px;background:linear-gradient(135deg,#b91c1c,#7f1d1d);
              border:2px solid #ef4444;border-radius:8px;color:#fff;font-size:18px;font-weight:bold;
              cursor:pointer;letter-spacing:1px;">
              NEXT CHAPTER ▶
            </button>
          ` : ''}
          <button id="replayBtn" style="padding:16px 40px;
            background:transparent;border:2px solid #ffd700;border-radius:8px;
            color:#ffd700;font-size:18px;font-weight:bold;cursor:pointer;">
            ${won ? '🔁 REPLAY' : '⚔️ TRY AGAIN'}
          </button>
          <button id="campMenuBtn" style="padding:16px 40px;
            background:transparent;border:2px solid #444;border-radius:8px;
            color:#888;font-size:18px;font-weight:bold;cursor:pointer;">
            CAMPAIGN MAP
          </button>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#replayBtn')?.addEventListener('click', () => {
        removeOverlay();
        showScreen('lobbyScreen');
        setTimeout(() => startChapter(chapterIdx), 100);
      });
      overlay.querySelector('#nextChBtn')?.addEventListener('click', () => {
        removeOverlay();
        showScreen('lobbyScreen');
        setTimeout(() => startChapter(savedProgress - 1 + 1 < CHAPTERS.length ? savedProgress : savedProgress - 1), 100);
      });
      overlay.querySelector('#campMenuBtn')?.addEventListener('click', () => {
        showScreen('lobbyScreen');
        showCampaignMenu();
      });
    }, 600);
  }

  // ── HELPERS (mirrors of main game helpers for bot use) ────────
  function dist2D(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  function botMove(bot, tx, ty, speed = PLAYER_SPEED) {
    const dx = tx - bot.x, dy = ty - bot.y;
    const mag = Math.sqrt(dx*dx+dy*dy)||1;
    const maxX = window.innerWidth/2-60, maxY = window.innerHeight/2-100;
    const nx = bot.x+(dx/mag)*speed, ny = bot.y+(dy/mag)*speed;
    if (Math.abs(nx) < maxX) bot.x = nx;
    if (Math.abs(ny) < maxY) bot.y = ny;
    setPlayerPos(bot.element, bot.x, bot.y);
  }
  function botRaiseShield(bot) {
    if (bot.isShielding || bot.shieldRaising) return;
    bot.shieldRaising = true;
    setTimeout(() => {
      if (!bot) return;
      bot.shieldRaising = false;
      bot.isShielding = true;
      if (bot.element) bot.element.classList.add('shielding');
    }, SHIELD_RAISE_MS);
  }
  function botLowerShield(bot) {
    bot.shieldRaising = false;
    bot.isShielding = false;
    if (bot.element) bot.element.classList.remove('shielding');
  }
  function botDash(bot, tx, ty) {
    if (!bot.dashReady) return;
    const maxX = window.innerWidth/2-60, maxY = window.innerHeight/2-100;
    for (let i=0;i<4;i++) setTimeout(()=>makeAfterimage(bot.x,bot.y,'#dc2626'),i*20);
    bot.x = Math.max(-maxX,Math.min(maxX,tx));
    bot.y = Math.max(-maxY,Math.min(maxY,ty));
    setPlayerPos(bot.element, bot.x, bot.y);
    bot.dashReady = false;
    setTimeout(()=>{ if(bot) bot.dashReady=true; }, DASH_COOLDOWN_MS);
  }
  function botAttack(bot, player) {
    if (!bot.canAttack || bot.isShielding) return;
    const now = Date.now();
    const damage = bot.charge >= 90 ? 25 : bot.charge < 10 ? 1 : Math.floor(bot.charge/100*25);
    const hitType = bot.charge >= 90 ? 'critical' : bot.charge < 10 ? 'weak' : 'normal';
    showSwordSwing(bot.element);

    const playerInClashWindow = (now-(window.myLastAttackTime||0))<PARRY_WINDOW_MS
      && !window.isShielding && !window.shieldRaising && (window.myLastSwingPower||0)>0;

    if (playerInClashWindow) {
      const diff = (window.myLastSwingPower||0) - damage;
      window.myLastSwingPower = 0;
      showParryEffect(player.element);
      if (diff >= 0) {
        const clashDmg = Math.max(1, diff);
        window.oppHealth = Math.max(0, window.oppHealth - clashDmg);
        bot.health = window.oppHealth;
        updateHealth(bot.element, window.oppHealth);
        showDamageNum(clashDmg, 'parry', bot.element);
        if (window.oppHealth <= 0 && window.currentMatch) { window.endMatch(true, false); return; }
      } else {
        const clashDmg = Math.max(1, Math.abs(diff));
        window.myHealth = Math.max(0, window.myHealth - clashDmg);
        player.health = window.myHealth;
        updateHealth(player.element, window.myHealth);
        showDamageNum(clashDmg, hitType, player.element);
        window.myLastHitTime = now;
        if (window.myHealth <= 0 && window.currentMatch) { window.endMatch(false, false); return; }
      }
      bot.canAttack = false; bot.charge = 0;
      setTimeout(()=>{ if(bot) bot.canAttack=true; }, 200);
      return;
    }

    let finalDamage = damage;
    if (window.isShielding) {
      finalDamage = Math.max(1, Math.floor(damage*0.5));
      showDamageNum(finalDamage, 'blocked', player.element);
    } else {
      showDamageNum(finalDamage, hitType, player.element);
      window.myLastHitTime = now;
    }
    window.myHealth = Math.max(0, window.myHealth - finalDamage);
    player.health = window.myHealth;
    updateHealth(player.element, window.myHealth);
    bot.charge = 0; bot.canAttack = false;
    setTimeout(()=>{ if(bot) bot.canAttack=true; }, 200);
    if (window.myHealth <= 0 && window.currentMatch) window.endMatch(false, false);
  }
  function showParryEffect(targetEl) {
    const r = targetEl.getBoundingClientRect();
    const label = document.createElement('div');
    label.className = 'damage-number dmg-parry';
    label.textContent = '⚡PARRY';
    label.style.left = (r.left + r.width/2) + 'px';
    label.style.top  = r.top + 'px';
    document.body.appendChild(label);
    setTimeout(()=>label.remove(), 900);
  }

  function removeOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  // ── INIT ─────────────────────────────────────────────────────
  hookEndMatch();

  return { open };

})();
