(function(){
  // Configure regions and rules here.
  // Regions: map region name -> array of ISO alpha-2 codes
  var regions = {
    "Southeast Asia": ["MM","KH","LA","SG","TL","BN","ID","MY","PH","TH","VN"],

    // Americas: North America + Central America + Caribbean + South America (incl. Brazil)
    Americas: [
      "US","CA",
      "MX","CO","EC","CR","GT","DO","PA","PR","VE","SV","HN","JM","NI","TT","HT","GY","BS","BZ","GF","BB","LC","VC","GD","AG","VI","VG","KN","TC","AW","KY","BM","MQ","GP","AI","CW","SX","MF","BQ","DM","AR","PE","CL","BO","UY","PY","SR",
      "BR"
    ],

    // Europe: Western EU + Eastern EU + Central Asia + Türkiye
    Europe: [
      "UZ","KZ","KG","TM","TJ","MN","GE","AM","MD","LV","LT","EE","AL","ME","MK","XK","BA","HR","SI","HU","SK","RS","RO","CZ","GR","PL","BG","TR","AZ",
        "AD","AT","BE","DK","FO","FI","FR","DE","GI","GG","IS","IE","IM","IT","JE","LI","LU","MT","MC","NL","NO","PT","SM","ES","SJ","SE","CH","GB","VA","AX"
    ],

    // MEA: Middle East + Africa
    MEA: ["SA","AE","EG","MA","DZ","TN","QA","LY","OM","LB","KW","BH","SY","JO","IQ"],

    // Pacific: South Asia + South Korea + Japan + Australia
    Pacific: [
      // South Asia
      "AF","BD","BT","MV","NP","PK","LK",
      // East Asia + Oceania
      "KR","JP","AU","NZ"
    ],

    // Greater China
    "Greater China": ["CN","HK","MO","TW"]
  };

  // Citizens of these countries cannot expand representation via PR outside this set
  var restrictedCitizenshipNoPRExpansion = ["CN","HK","MO","TW"]; // China, Hong Kong, Macao, Chinese Taipei

  // Countries disallowed from participation entirely (ISO alpha-2)
  // Any representation option resolving to one of these codes will be rejected.
  var disallowedParticipationCountries = ["UA", "IR", "KP", "CU"];

  // Optional: explicit map of country -> region (auto-built from regions but can override)
  var countryToRegion = {};
  Object.keys(regions).forEach(function(r){
    regions[r].forEach(function(code){ countryToRegion[code] = r; });
  });

  // Helpers
  function getRegionOfCountry(code){ return countryToRegion[code] || null; }
  function isInRegion(code, region){ return !!code && countryToRegion[code] === region; }

  // Minimum players required for the team to be considered representing a country per region
  // Default is 2; Southeast Asia requires 3.
  var teamRepresentationMinByRegion = {
    "Southeast Asia": 3
  };
  function getTeamMinPlayersForRegion(region){
    if(region && Object.prototype.hasOwnProperty.call(teamRepresentationMinByRegion, region)){
      return teamRepresentationMinByRegion[region];
    }
    return 2;
  }

  // Configurable import limit per region (players with no in-region representable option)
  // Default: 1 import allowed per region. Set to 0 to disallow, or null to allow unlimited.
  var maxImportsByRegion = {};
  function getMaxImportsForRegion(region){
    if(region && Object.prototype.hasOwnProperty.call(maxImportsByRegion, region)){
      return maxImportsByRegion[region];
    }
    return 1; // default behavior
  }

  window.AppConfig = {
    regions: regions,
    restrictedCitizenshipNoPRExpansion: restrictedCitizenshipNoPRExpansion,
    disallowedParticipationCountries: disallowedParticipationCountries,
    getRegionOfCountry: getRegionOfCountry,
    isInRegion: isInRegion,
    teamRepresentationMinByRegion: teamRepresentationMinByRegion,
    getTeamMinPlayersForRegion: getTeamMinPlayersForRegion,
    maxImportsByRegion: maxImportsByRegion,
    getMaxImportsForRegion: getMaxImportsForRegion,
    // Allowed team-representable countries by region (ISO alpha-2)
    teamRepresentableCountriesByRegion: {
      "Southeast Asia": ["MM","KH","LA","SG","TL","BN","ID","MY","PH"],
      Pacific: ["JP","KR","PK","BD","NP","LK","MV","BT","AU","NZ"],
      "Greater China": ["HK","MO"],
      Americas: [
       "US","CA", "MX","CO","EC","CR","GT","DO","PA","PR","VE","SV","HN","JM","NI","TT","HT","GY","BS","BZ","GF","BB","LC","VC","GD","AG","VI","VG","KN","TC","AW","KY","BM","MQ","GP","AI","CW","SX","MF","BQ","DM","AR","PE","CL","BO","UY","PY","SR","BR"
      ],
      MEA: ["SA","AE","EG","MA","DZ","TN","QA","LY","OM","LB","KW","BH","SY","JO","IQ"],
      Europe: [
        "UZ","KZ","KG","TM","TJ","MN","GE","AM","MD","LV","LT","EE","AL","ME","MK","XK","BA","HR","SI","HU","SK","RS","RO","CZ","GR","PL","BG","TR","AZ",
        "AD","AT","BE","DK","FO","FI","FR","DE","GI","GG","IS","IE","IM","IT","JE","LI","LU","MT","MC","NL","NO","PT","SM","ES","SJ","SE","CH","GB","VA","AX"
      ]
    },
    // Tournaments: each defines allowed representable countries and optional region rule
    tournaments: [
      { id: 'jp', name: 'Japan', region: 'Pacific', allowedCountries: ["JP"], minPlayers: 2 },
      { id: 'kr', name: 'South Korea', region: 'Pacific', allowedCountries: ["KR"], minPlayers: 2 },
      { id: 'sa', name: 'South Asia', region: 'Pacific', allowedCountries: ["PK","BD","NP","LK","MV","BT","AU","NZ"], minPlayers: 2 },
      { id: 'sea-id', name: 'SEA Indonesia', region: 'Southeast Asia', allowedCountries: ["ID"], minPlayers: 3 },
      { id: 'sea-my', name: 'SEA Malaysia', region: 'Southeast Asia', allowedCountries: ["MY"], minPlayers: 3 },
      { id: 'sea-ph', name: 'SEA Philippines', region: 'Southeast Asia', allowedCountries: ["PH"], minPlayers: 3 },
      { id: 'sea-ph', name: 'SEA Wildcard', region: 'Southeast Asia', allowedCountries: ["MM","KH","LA","SG","TL","BN"], minPlayers: 3 },
      { id: 'na', name: 'North America', region: 'Americas', allowedCountries: ["US","CA"], minPlayers: 2 },
      { id: 'lan', name: 'North LATAM', region: 'Americas', allowedCountries: ["MX","CO","EC","CR","GT","DO","PA","PR","VE","SV","HN","JM"], minPlayers: 2 },
      { id: 'las', name: 'South LATAM', region: 'Americas', allowedCountries: ["NI","TT","HT","GY","BS","BZ","GF","BB","LC","VC","GD","AG","VI","VG","KN","TC","AW","KY","BM","MQ","GP","AI","CW","SX","MF","BQ","DM","AR","PE","CL","BO","UY","PY","SR"], minPlayers: 2 },
      { id: 'br', name: 'Brazil', region: 'Americas', allowedCountries: ["BR"], minPlayers: 2 },
      { id: 'eeu', name: 'Eastern Europe & Central Asia', region: 'Europe', allowedCountries: ["UZ","KZ","KG","TM","TJ","MN","GE","AM","MD","LV","LT","EE","AL","ME","MK","XK","BA","HR","SI","HU","SK","RS","RO","CZ","GR","PL","BG","TR","AZ"], minPlayers: 2 },
      { id: 'weu', name: 'Western Europe', region: 'Europe', allowedCountries: ["AD","AT","BE","DK","FO","FI","FR","DE","GI","GG","IS","IE","IM","IT","JE","LI","LU","MT","MC","NL","NO","PT","SM","ES","SJ","SE","CH","GB","VA","AX"], minPlayers: 2 },
      { id: 'hkmo', name: 'Hong Kong & Macao', region: 'Greater China', allowedCountries: ["HK", "MO"], minPlayers: 2 },
    ]
  };
})();
