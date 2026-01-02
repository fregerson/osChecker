(function(){
  var Config = window.AppConfig || { regions: {}, restrictedCitizenshipNoPRExpansion: [], getRegionOfCountry: function(){return null;}, isInRegion: function(){return false;} };

  function isRestrictedCitizen(code){
    return Config.restrictedCitizenshipNoPRExpansion.indexOf(code) !== -1;
  }

  // Return all countries a player may represent given nationality/secondary/PR and restrictions
  function getRepresentableOptions(nationalityCode, prCode, secondaryNationalityCode){
    var options = [];
    var primary = nationalityCode || "";
    var secondary = secondaryNationalityCode || "";
    var pr = prCode || "";
    var restrictedSet = Config.restrictedCitizenshipNoPRExpansion || [];

    function allowed(code){ return !!code; }

    // If any nationality is restricted, only the restricted nationality is allowed; PR is ignored
    var restrictedPresent = [primary, secondary].filter(function(n){ return n && restrictedSet.indexOf(n) !== -1; });
    if(restrictedPresent.length > 0){
      var chosenRestricted = restrictedPresent[0];
      if(allowed(chosenRestricted)) options.push(chosenRestricted);
      return options;
    }

    // Non-restricted: PR (if allowed), then primary nationality, then secondary nationality
    if(allowed(pr)) options.push(pr);
    if(allowed(primary)) options.push(primary);
    if(allowed(secondary)) options.push(secondary);

    // Deduplicate preserving order
    var seen = {};
    return options.filter(function(c){ if(seen[c]) return false; seen[c] = true; return true; });
  }

  // Team checks should be based on representable country (not PR vs nationality selection separately)

  // Determine the final representable country for a player based on nationality, PR, and rules
  function computeRepresentableCountry(nationalityCode, prCode, secondaryNationalityCode){
    if(!nationalityCode){ return { country: null, reason: "No nationality selected", eligible: false }; }
    var pr = prCode || "";
    var secondary = secondaryNationalityCode || "";

    // Dual nationality handling: if any nationality is restricted, nationality-only with the restricted one
    var nationalities = [];
    nationalities.push(nationalityCode);
    if(secondary) nationalities.push(secondary);
    var restrictedSet = Config.restrictedCitizenshipNoPRExpansion || [];
    var restrictedPresent = nationalities.filter(function(n){ return restrictedSet.indexOf(n) !== -1; });
    if(restrictedPresent.length > 0){
      // Restricted citizens can only represent their restricted nationality; PR does not expand representation.
      var chosenRestricted = restrictedPresent[0];
      return { country: null, reason: "Restricted citizen; nationality disallowed", eligible: false };
    }

    if(isRestrictedCitizen(nationalityCode)){
      // Restricted citizens are not allowed dual representation via PR at all.
      // They can only represent their nationality.
      return { country: null, reason: "Restricted citizen; nationality disallowed and PR not permitted", eligible: false };
    }

    // Non-restricted citizens
    // Non-restricted citizens: nationality (primary or secondary) is fine; PR can override if allowed.
    // Prefer PR when present and allowed; else choose a valid nationality (prefer primary, fall back to secondary).
    if(pr && !isPrDisallowed){
      return { country: pr, reason: "Has permanent residency; may represent PR country", eligible: true };
    }
    if(secondary && !isSecondaryDisallowed){
      return { country: secondary, reason: "Represents second nationality (primary disallowed)", eligible: true };
    }
    return { country: null, reason: "Nationality disallowed for representation and PR not usable", eligible: false };
  }

  // Single-player UI helper used by the simple form
  function evaluateEligibility(nationalityCode, prCode, secondaryNationalityCode){
    var res = computeRepresentableCountry(nationalityCode, prCode, secondaryNationalityCode);
    if(!res.country){
      return { eligible: false, severity: "bad", message: res.reason };
    }
    return { eligible: true, severity: "ok", message: "Eligible to represent " + res.country + ". " + res.reason };
  }

  // Roster evaluation
  // players: [{ nationality: "US", pr: "CA" }, ...], region: "Europe"
  function evaluateRoster(players, region){
    var MAX_PLAYERS = 7;
    var issues = [];
    var representations = [];
    var minForTeamCountry = (Config.getTeamMinPlayersForRegion ? Config.getTeamMinPlayersForRegion(region) : 2);

    if(!region || !Config.regions[region]){
      issues.push({ severity: "bad", message: "Please select a valid region." });
      return { ok: false, issues: issues, details: { representations: [] } };
    }
    if(players.length < 5){
      issues.push({ severity: "bad", message: "Roster must have at least 5 players." });
    }
    if(players.length > MAX_PLAYERS){
      issues.push({ severity: "bad", message: "Roster exceeds maximum of " + MAX_PLAYERS + " players." });
    }

    // Gather representable options per player
    var playerOptions = [];
    players.forEach(function(p, idx){
      var opts = getRepresentableOptions(p.nationality || "", p.pr || "", p.secondaryNationality || "");
      playerOptions.push({ index: idx, options: opts });
      if(opts.length === 0){
        issues.push({ severity: "bad", message: "Player " + (idx+1) + " has no representable country." });
      }
    });

    // Count players not from region: players with no in-region representable option
    var notFromRegion = playerOptions.filter(function(po){ return !po.options.some(function(c){ return Config.isInRegion(c, region); }); });
    var maxImports = (Config.getMaxImportsForRegion ? Config.getMaxImportsForRegion(region) : 1);
    if(maxImports != null && notFromRegion.length > maxImports){
      issues.push({ severity: "bad", message: "Roster has " + notFromRegion.length + " players not from " + region + " (max " + maxImports + " allowed)." });
    }

    // Must have at least N players able to represent the same allowed country for this region
    var counts = {};
    var whitelist = (Config.teamRepresentableCountriesByRegion && Config.teamRepresentableCountriesByRegion[region]) || null;
    playerOptions.forEach(function(po){
      var seen = {};
      po.options.forEach(function(c){
        if(whitelist && whitelist.indexOf(c) === -1) return;
        if(!Config.isInRegion(c, region)) return; // only count countries belonging to this region
        if(seen[c]) return; seen[c] = true; // count each player once per country
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    var eligibleTeamCountries = Object.keys(counts).filter(function(c){ return counts[c] >= minForTeamCountry; });

    if(eligibleTeamCountries.length === 0){
      var baseMsg = "Team cannot represent a country in " + region + ": requires at least " + minForTeamCountry + " players from the same country.";
      issues.push({ severity: "bad", message: baseMsg });
    } else {
      issues.push({ severity: "ok", message: "Team may represent: " + eligibleTeamCountries.join(', ') + " (min=" + minForTeamCountry + ")" });
    }

    // Build per-player chosen representation summary: prefer target country if available, else any in-region option, else first available
    var primaryTarget = eligibleTeamCountries.length > 0 ? eligibleTeamCountries[0] : null;
    playerOptions.forEach(function(po){
      var chosen = null;
      if(primaryTarget && po.options.indexOf(primaryTarget) !== -1){
        chosen = primaryTarget;
      } else {
        for(var i=0;i<po.options.length;i++){ if(Config.isInRegion(po.options[i], region)){ chosen = po.options[i]; break; } }
        if(!chosen && po.options.length > 0) chosen = po.options[0];
      }
      representations.push({ index: po.index, country: chosen, options: po.options });
    });

    var ok = issues.filter(function(i){ return i.severity === "bad"; }).length === 0;
    return { ok: ok, issues: issues, details: { representations: representations, notFromRegion: notFromRegion, counts: counts, eligibleTeamCountries: eligibleTeamCountries, minForTeamCountry: minForTeamCountry } };
  }

  // Evaluate the roster across all configured regions
  function evaluateRosterForAll(players){
    var regions = Object.keys(Config.regions || {});
    var results = [];
    regions.forEach(function(r){
      results.push({ region: r, result: evaluateRoster(players, r) });
    });
    return results;
  }

  // Evaluate roster for tournaments: checks allowed countries, optional region rule, and min players
  function evaluateRosterForTournaments(players){
    var tourneys = (Config.tournaments || []);
    var results = [];
    // Precompute player representable options once
    var playerOptions = players.map(function(p, idx){
      return { index: idx, options: getRepresentableOptions(p.nationality || "", p.pr || "", p.secondaryNationality || "") };
    });

    tourneys.forEach(function(t){
      var issues = [];
      var counts = {};
      var minPlayers = (t.minPlayers != null ? t.minPlayers : (t.region ? Config.getTeamMinPlayersForRegion(t.region) : 2));
      var allowed = t.allowedCountries || [];

      // Region rule: limit players with no in-region representable option (imports)
      if(t.region){
        var notFromRegion = playerOptions.filter(function(po){ return !po.options.some(function(c){ return Config.isInRegion(c, t.region); }); });
        var maxImports = (t.maxImports != null ? t.maxImports : (Config.getMaxImportsForRegion ? Config.getMaxImportsForRegion(t.region) : 1));
        if(maxImports != null && notFromRegion.length > maxImports){
          issues.push({ severity: "bad", message: "Roster has " + notFromRegion.length + " players not from " + t.region + " (max " + maxImports + " allowed)." });
        }
      }

      // Count per allowed country (optionally require country belonging to region if provided)
      playerOptions.forEach(function(po){
        var seen = {};
        po.options.forEach(function(c){
          if(allowed.indexOf(c) === -1) return;
          if(t.region && !Config.isInRegion(c, t.region)) return;
          if(seen[c]) return; seen[c] = true;
          counts[c] = (counts[c]||0)+1;
        });
      });

      var eligibleTeamCountries = Object.keys(counts).filter(function(c){ return counts[c] >= minPlayers; });
      if(eligibleTeamCountries.length === 0){
        issues.push({ severity: "bad", message: "Team cannot enter " + t.name + ": requires at least " + minPlayers + " players able to represent the same allowed country." });
      } else {
        issues.push({ severity: "ok", message: "Eligible for " + t.name + ": " + eligibleTeamCountries.join(', ') + " (min=" + minPlayers + ")" });
      }

      // Build per-player summary for this tournament
      var representations = [];
      var primaryTarget = eligibleTeamCountries.length ? eligibleTeamCountries[0] : null;
      playerOptions.forEach(function(po){
        var chosen = null;
        if(primaryTarget && po.options.indexOf(primaryTarget) !== -1){
          chosen = primaryTarget;
        } else {
          for(var i=0;i<po.options.length;i++){
            var c = po.options[i];
            if(allowed.indexOf(c) !== -1 && (!t.region || Config.isInRegion(c, t.region))){ chosen = c; break; }
          }
          if(!chosen && po.options.length > 0) chosen = po.options[0];
        }
        representations.push({ index: po.index, country: chosen, options: po.options });
      });

      var ok = issues.filter(function(i){ return i.severity === "bad"; }).length === 0;
      results.push({ tournament: t, ok: ok, issues: issues, details: { counts: counts, eligibleTeamCountries: eligibleTeamCountries, representations: representations, minPlayers: minPlayers } });
    });

    return results;
  }

  window.evaluateEligibility = evaluateEligibility;
  window.computeRepresentableCountry = computeRepresentableCountry;
  window.evaluateRoster = evaluateRoster;
  window.evaluateRosterForAll = evaluateRosterForAll;
  window.evaluateRosterForTournaments = evaluateRosterForTournaments;
})();
