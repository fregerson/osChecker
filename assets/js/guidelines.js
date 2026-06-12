(function(){
  var Config = window.AppConfig || { regions: {}, restrictedCitizenshipNoPRExpansion: [], getRegionOfCountry: function(){return null;}, isInRegion: function(){return false;} };

  function isRestrictedCitizen(code){
    return Config.restrictedCitizenshipNoPRExpansion.indexOf(code) !== -1;
  }

  function isDisallowedCountry(code){
    var disallowed = Config.disallowedParticipationCountries || [];
    return !!code && disallowed.indexOf(code) !== -1;
  }

  // Return all countries a player may represent given nationality/secondary/PR and restrictions
  function getRepresentableOptions(nationalityCode, prCode, secondaryNationalityCode){
    var options = [];
    var primary = nationalityCode || "";
    var secondary = secondaryNationalityCode || "";
    var pr = prCode || "";
    var restrictedSet = Config.restrictedCitizenshipNoPRExpansion || [];

    function allowed(code){ return !!code && !isDisallowedCountry(code); }

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
    return options.filter(function(c){ if(seen[c]) return false; seen[c] = true; return !isDisallowedCountry(c); });
  }

  function getDisallowedSelectionCodes(player){
    var codes = [];
    var seen = {};
    if(!player) return codes;
    [player.nationality, player.secondaryNationality, player.pr].forEach(function(code){
      if(!isDisallowedCountry(code) || seen[code]) return;
      seen[code] = true;
      codes.push(code);
    });
    return codes;
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
      return { country: chosenRestricted, reason: "Restricted citizen; only the restricted nationality is representable", eligible: true };
    }

    if(isRestrictedCitizen(nationalityCode)){
      // Restricted citizens are not allowed dual representation via PR at all.
      // They can only represent their nationality.
      return { country: nationalityCode, reason: "Restricted citizen; only the nationality is representable", eligible: true };
    }

    // Non-restricted citizens
    // Non-restricted citizens: nationality (primary or secondary) is fine; PR can override if allowed.
    // Prefer PR when present and allowed; else choose a valid nationality (prefer primary, fall back to secondary).
    function allowed(code){ return !!code && !isDisallowedCountry(code); }
    if(allowed(pr)){
      return { country: pr, reason: "Has permanent residency; may represent PR country", eligible: true };
    }
    if(allowed(nationalityCode)){
      return { country: nationalityCode, reason: "Represents nationality", eligible: true };
    }
    if(allowed(secondary)){
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

    // Build counts across all in-region representable countries (before whitelist)
    var countsAllRegion = {};
    playerOptions.forEach(function(po){
      var seenAll = {};
      po.options.forEach(function(c){
        if(!Config.isInRegion(c, region)) return;
        if(seenAll[c]) return; seenAll[c] = true;
        countsAllRegion[c] = (countsAllRegion[c] || 0) + 1;
      });
    });

    // Apply whitelist counts (allowed countries for this region)
    var counts = {};
    var whitelist = (Config.teamRepresentableCountriesByRegion && Config.teamRepresentableCountriesByRegion[region]) || null;
    playerOptions.forEach(function(po){
      var seen = {};
      po.options.forEach(function(c){
        if(isDisallowedCountry(c)) return; // skip banned participation countries
        if(!Config.isInRegion(c, region)) return; // only count countries belonging to this region
        if(whitelist && whitelist.indexOf(c) === -1) return; // apply region whitelist
        if(seen[c]) return; seen[c] = true; // count each player once per country
        counts[c] = (counts[c] || 0) + 1;
      });
    });

    // Determine non-strict majority across all in-region countries (ignore whitelist)
    var maxCount = 0;
    Object.keys(countsAllRegion).forEach(function(c){ if(countsAllRegion[c] > maxCount) maxCount = countsAllRegion[c]; });
    var topCountriesAllRegion = Object.keys(countsAllRegion).filter(function(c){ return countsAllRegion[c] === maxCount && maxCount > 0; });

    // Eligible countries must meet minimum and then be constrained by the global majority set
    var eligibleTeamCountries = Object.keys(counts).filter(function(c){ return counts[c] >= minForTeamCountry; });
    if(topCountriesAllRegion.length > 0){
      var topSet = {};
      topCountriesAllRegion.forEach(function(c){ topSet[c] = true; });
      var intersect = eligibleTeamCountries.filter(function(c){ return !!topSet[c]; });
      if(intersect.length > 0){
        eligibleTeamCountries = intersect;
        if(topCountriesAllRegion.length === 1){
          issues.push({ severity: "ok", message: "Top country detected (non-strict majority): " + topCountriesAllRegion[0] + " (" + maxCount + "/" + players.length + ") — team must represent this country if allowed." });
        } else {
          issues.push({ severity: "ok", message: "Top countries tied (non-strict majority): " + topCountriesAllRegion.join(', ') + " (" + maxCount + "/" + players.length + ") — team may represent one of these if allowed." });
        }
      } else {
        // No allowed countries match the majority set
        issues.push({ severity: "bad", message: "Majority set not allowed for representation in this region." });
      }
    }

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

    var playerDisallowedIssues = [];
    players.forEach(function(player, idx){
      var disallowedCodes = getDisallowedSelectionCodes(player);
      if(disallowedCodes.length > 0){
        playerDisallowedIssues.push({
          playerIndex: idx,
          codes: disallowedCodes,
          message: "Player " + (idx + 1) + " is from a country that may not be allowed for participation: " + disallowedCodes.join(', ') + ". Please check with staff on official eligibility."
        });
      }
    });

    // Determine the roster's top representable countries before looking at tournaments.
    // We use the most supported country/countries across all player options as the roster's
    // candidate representation set.
    var countsAllCountries = {};
    playerOptions.forEach(function(po){
      var seenAll = {};
      po.options.forEach(function(c){
        if(seenAll[c]) return; seenAll[c] = true;
        countsAllCountries[c] = (countsAllCountries[c] || 0) + 1;
      });
    });
    var maxAllCount = 0;
    Object.keys(countsAllCountries).forEach(function(c){ if(countsAllCountries[c] > maxAllCount) maxAllCount = countsAllCountries[c]; });
    var topCountriesAll = Object.keys(countsAllCountries).filter(function(c){ return countsAllCountries[c] === maxAllCount && maxAllCount > 0; });

    // Determine majority region across all representable country support.
    var regionSupportCounts = {};
    Object.keys(countsAllCountries).forEach(function(c){
      var r = Config.getRegionOfCountry ? Config.getRegionOfCountry(c) : null;
      if(!r) return;
      regionSupportCounts[r] = (regionSupportCounts[r] || 0) + countsAllCountries[c];
    });
    var maxRegionSupport = 0;
    Object.keys(regionSupportCounts).forEach(function(r){ if(regionSupportCounts[r] > maxRegionSupport) maxRegionSupport = regionSupportCounts[r]; });
    var majorityRegions = Object.keys(regionSupportCounts).filter(function(r){ return regionSupportCounts[r] === maxRegionSupport && maxRegionSupport > 0; });
    var majorityRegion = majorityRegions.length ? majorityRegions[0] : null;

    var tournamentAllowedCountries = {};
    tourneys.forEach(function(t){
      (t.allowedCountries || []).forEach(function(c){ tournamentAllowedCountries[c] = true; });
    });

    // If the roster can represent one or more countries, but none of those countries appear
    // in any configured tournament, return one generic failure instead of a tournament-by-tournament dump.
    if(maxAllCount >= 2 && topCountriesAll.length > 0 && !topCountriesAll.some(function(c){ return !!tournamentAllowedCountries[c]; })){
      var genericMessage = "Rosters representing " + topCountriesAll.join(', ') + " do not have a tournament. Please check with staff on official eligibility.";
      tourneys.forEach(function(t){
        results.push({
          tournament: t,
          ok: false,
          issues: [{ severity: "bad", message: genericMessage }],
          details: { counts: {}, eligibleTeamCountries: [], representations: [], minPlayers: (t.minPlayers != null ? t.minPlayers : (t.region ? Config.getTeamMinPlayersForRegion(t.region) : 2)), representableCountries: topCountriesAll, majorityRegion: majorityRegion, majorityRegions: majorityRegions }
        });
      });
      return results;
    }

    tourneys.forEach(function(t){
      var issues = [];
      var counts = {};
      var minPlayers = (t.minPlayers != null ? t.minPlayers : (t.region ? Config.getTeamMinPlayersForRegion(t.region) : 2));
      var allowed = t.allowedCountries || [];

      playerDisallowedIssues.forEach(function(issue){
        issues.push({ severity: "bad", message: issue.message });
      });

      // Region rule: limit players with no in-region representable option (imports)
      if(t.region){
        var notFromRegion = playerOptions.filter(function(po){ return !po.options.some(function(c){ return Config.isInRegion(c, t.region); }); });
        var maxImports = (t.maxImports != null ? t.maxImports : (Config.getMaxImportsForRegion ? Config.getMaxImportsForRegion(t.region) : 1));
        if(maxImports != null && notFromRegion.length > maxImports){
          issues.push({ severity: "bad", message: "Roster has " + notFromRegion.length + " players not from " + t.region + " (max " + maxImports + " allowed)." });
        }
      }

      // Global majority before whitelist (allowedCountries): compute counts across all in-region countries
      var countsAllRegion = {};
      playerOptions.forEach(function(po){
        var seenAll = {};
        po.options.forEach(function(c){
          if(t.region && !Config.isInRegion(c, t.region)) return;
          if(seenAll[c]) return; seenAll[c] = true;
          countsAllRegion[c] = (countsAllRegion[c]||0)+1;
        });
      });
      var maxCount = 0;
      Object.keys(countsAllRegion).forEach(function(c){ if(countsAllRegion[c] > maxCount) maxCount = countsAllRegion[c]; });
      var topCountriesAllRegion = Object.keys(countsAllRegion).filter(function(c){ return countsAllRegion[c] === maxCount && maxCount > 0; });

      // Count per allowed country (optionally require country belonging to region if provided)
      playerOptions.forEach(function(po){
        var seen = {};
        po.options.forEach(function(c){
          if(isDisallowedCountry(c)) return; // skip banned participation countries
          if(allowed.indexOf(c) === -1) return;
          if(t.region && !Config.isInRegion(c, t.region)) return;
          if(seen[c]) return; seen[c] = true;
          counts[c] = (counts[c]||0)+1;
        });
      });

      var eligibleTeamCountries = Object.keys(counts).filter(function(c){ return counts[c] >= minPlayers; });
      // Enforce non-strict global majority before whitelist
      if(topCountriesAllRegion.length > 0){
        var topSet = {};
        topCountriesAllRegion.forEach(function(c){ topSet[c] = true; });
        var intersect = eligibleTeamCountries.filter(function(c){ return !!topSet[c]; });
        if(intersect.length > 0){
          eligibleTeamCountries = intersect;
          if(topCountriesAllRegion.length === 1){
            issues.push({ severity: "ok", message: "Top country detected (non-strict majority): " + topCountriesAllRegion[0] + " (" + maxCount + "/" + players.length + ") — team must represent this country if allowed." });
          } else {
            issues.push({ severity: "ok", message: "Top countries tied (non-strict majority): " + topCountriesAllRegion.join(', ') + " (" + maxCount + "/" + players.length + ") — team may represent one of these if allowed." });
          }
        } else {
          issues.push({ severity: "bad", message: "Majority set not allowed for this tournament." });
        }
      }
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
      results.push({ tournament: t, ok: ok, issues: issues, details: { counts: counts, eligibleTeamCountries: eligibleTeamCountries, representableCountries: topCountriesAll, regionRepresentableCountries: topCountriesAllRegion, representations: representations, minPlayers: minPlayers, majorityRegion: majorityRegion, majorityRegions: majorityRegions } });
    });

    return results;
  }

  window.evaluateEligibility = evaluateEligibility;
  window.computeRepresentableCountry = computeRepresentableCountry;
  window.evaluateRoster = evaluateRoster;
  window.evaluateRosterForAll = evaluateRosterForAll;
  window.evaluateRosterForTournaments = evaluateRosterForTournaments;
})();
