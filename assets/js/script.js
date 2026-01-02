(function(){
  var rosterForm = document.getElementById('rosterForm');
  var rosterPlayers = document.getElementById('rosterPlayers');
  var rosterResult = document.getElementById('rosterResult');
  var addPlayerBtn = document.getElementById('addPlayerBtn');
  var removePlayerBtn = document.getElementById('removePlayerBtn');
  var countryOptions = [];

  function optionEl(label, value){
    var o = document.createElement('option');
    o.textContent = label;
    o.value = value;
    return o;
  }

  function renderAlert(kind, text){
    var cls = kind === 'ok' ? 'alert alert-ok' : kind === 'warn' ? 'alert alert-warn' : 'alert alert-bad';
    rosterResult.innerHTML = '';
    var div = document.createElement('div');
    div.className = cls;
    div.textContent = text;
    rosterResult.appendChild(div);
  }

  function loadCountries(){
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      .then(function(r){ return r.json(); })
      .then(function(list){
        // Build map code -> name
        var map = {};
        list.forEach(function(c){
          var name = c && c.name && c.name.common ? c.name.common : '';
          var code = c && c.cca2 ? c.cca2 : '';
          if(!name || !code) return;
          map[code] = name;
        });
        // Merge extras
        var extras = window.EXTRA_COUNTRIES || [];
        extras.forEach(function(x){
          if(!x || !x.code) return;
          var name = x.name || x.code;
          // Always apply extras to allow renames/overrides
          map[x.code] = name;
        });

        // Build final sorted list
        var finalList = Object.keys(map).map(function(code){ return { code: code, name: map[code] }; });
        finalList.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });

        countryOptions = finalList;
        // Expose code->name map for rendering summaries
        window.COUNTRY_NAMES = map;

        // Initialize roster controls after countries load
        ensureRosterRows(5); // start with 5 rows
      })
      .catch(function(){
        renderAlert('bad', 'Failed to load country list. Please refresh.');
      });
  }

  // Regions are auto-evaluated; no manual select needed

  function rosterRow(){
    var wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginBottom = '8px';
    // Nationality row
    var natField = document.createElement('div'); natField.className = 'field';
    var natLabel = document.createElement('label'); natLabel.textContent = 'Nationality'; natLabel.style.fontWeight = '600';
    var natSel = document.createElement('select'); natSel.required = true; natSel.appendChild(optionEl('Select a country',''));
    natField.appendChild(natLabel); natField.appendChild(natSel);

    // Second Nationality row
    var secNatField = document.createElement('div'); secNatField.className = 'field';
    var secNatLabel = document.createElement('label'); secNatLabel.textContent = 'Second Nationality'; secNatLabel.style.fontWeight = '600';
    var secNatSel = document.createElement('select'); secNatSel.appendChild(optionEl('None',''));
    secNatField.appendChild(secNatLabel); secNatField.appendChild(secNatSel);

    // Permanent Residency row
    var prField = document.createElement('div'); prField.className = 'field';
    var prLabel = document.createElement('label'); prLabel.textContent = 'Permanent Residency'; prLabel.style.fontWeight = '600';
    var prSel = document.createElement('select'); prSel.appendChild(optionEl('None',''));
    prField.appendChild(prLabel); prField.appendChild(prSel);
    // fill options from unified countryOptions
    countryOptions.forEach(function(opt){ natSel.appendChild(optionEl(opt.name, opt.code)); });
    countryOptions.forEach(function(opt){ secNatSel.appendChild(optionEl(opt.name, opt.code)); });
    countryOptions.forEach(function(opt){ prSel.appendChild(optionEl(opt.name, opt.code)); });
    wrap.appendChild(natField); wrap.appendChild(secNatField); wrap.appendChild(prField);
    return { el: wrap, nat: natSel, secNat: secNatSel, pr: prSel };
  }

  function ensureRosterRows(n){
    while(rosterPlayers.childElementCount < n && rosterPlayers.childElementCount < 7){
      var row = rosterRow();
      rosterPlayers.appendChild(row.el);
    }
  }

  addPlayerBtn.addEventListener('click', function(){
    ensureRosterRows(rosterPlayers.childElementCount + 1);
  });

  removePlayerBtn.addEventListener('click', function(){
    if(rosterPlayers.childElementCount > 5){
      rosterPlayers.removeChild(rosterPlayers.lastElementChild);
    }
  });

  rosterForm.addEventListener('submit', function(e){
    e.preventDefault();
    rosterResult.innerHTML = '';
    var players = [];
    Array.prototype.slice.call(rosterPlayers.children).forEach(function(card){
      var selects = card.getElementsByTagName('select');
      var nat = selects[0].value; var secNat = selects[1].value; var pr = selects[2].value;
      players.push({ nationality: nat, secondaryNationality: secNat, pr: pr });
    });
    if(players.length < 5){
      var warn = document.createElement('div'); warn.className = 'alert alert-bad'; warn.textContent = 'Roster must have at least 5 players.'; rosterResult.appendChild(warn);
      return;
    }
    var tourneyResults = window.evaluateRosterForTournaments(players);
    var codeToName = function(code){ var m = window.COUNTRY_NAMES || {}; return (m && m[code]) || code || 'None'; };
    // Filter and render only eligible tournaments
    if(!tourneyResults.length){
      var info = document.createElement('div'); info.className = 'alert alert-warn'; info.textContent = 'No tournaments configured. Add them in assets/js/config.js.'; rosterResult.appendChild(info);
    } else {
      var eligible = tourneyResults.filter(function(e){ return !!e.ok; });
      if(eligible.length === 0){
        var none = document.createElement('div'); none.className = 'alert alert-warn'; none.textContent = 'No eligible tournaments for this roster.'; rosterResult.appendChild(none);
        return;
      }
      eligible.forEach(function(entry){
        var name = entry.tournament && entry.tournament.name ? entry.tournament.name : (entry.tournament && entry.tournament.id) || 'Tournament';
        var header = document.createElement('div'); header.className = 'small'; header.style.fontWeight = '600'; header.style.margin = '8px 0 4px'; header.textContent = name;
        rosterResult.appendChild(header);
        var ok = document.createElement('div');
        ok.className = 'alert alert-ok';
        var eligibleCountries = (entry.details && entry.details.eligibleTeamCountries) || [];
        var eligibleNames = eligibleCountries.map(codeToName);
        var minPlayers = entry.details && entry.details.minPlayers ? entry.details.minPlayers : (entry.tournament && entry.tournament.minPlayers) || 2;
        ok.textContent = 'Eligible for ' + name + ': ' + (eligibleNames.length ? eligibleNames.join(', ') : '—') + ' (min=' + minPlayers + ')';
        rosterResult.appendChild(ok);
        var reps = (entry.details && entry.details.representations) || [];
        if(reps.length){
          var list = document.createElement('div'); list.className = 'small'; list.style.margin = '6px 0 12px';
          var lines = reps.map(function(r){ var chosen = codeToName(r.country); return 'Player ' + (r.index + 1) + ': ' + chosen; });
          list.textContent = 'Chosen per-player representation: ' + lines.join(' • ');
          rosterResult.appendChild(list);
        }
      });
    }
  });

  loadCountries();
})();
