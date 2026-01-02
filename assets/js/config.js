(function(){
  // Configure regions and rules here.
  // Regions: map region name -> array of ISO alpha-2 codes
  var regions = {
    // Southeast Asia definition per requirements:
    // Myanmar (MM), Cambodia (KH), Laos (LA), Singapore (SG), Timor-Leste (TL),
    // Brunei (BN), Indonesia (ID), Malaysia (MY), Philippines (PH), plus Thailand (TH) and Vietnam (VN)
    // Note: TH and VN are counted in-region but cannot be represented (see disallowedRepresentCountries below)
    "Southeast Asia": ["MM","KH","LA","SG","TL","BN","ID","MY","PH","TH","VN"],

    // Americas: North America + Central America + Caribbean + South America (incl. Brazil)
    Americas: [
      // North America
      "CA","US","MX",
      // Central America
      "BZ","CR","SV","GT","HN","NI","PA",
      // Caribbean (sovereign states)
      "AG","BS","BB","CU","DM","DO","GD","HT","JM","KN","LC","VC","TT",
      // South America
      "AR","BO","BR","CL","CO","EC","GY","PE","PY","SR","UY","VE"
    ],

    // Europe: West + East + Türkiye
    Europe: [
      // Western/Northern/Southern Europe (selection)
      "AD","AL","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GR","HR","HU","IE","IS","IT","LI","LT","LU","LV","MD","MC","ME","MK","MT","NL","NO","PL","PT","RO","RS","RU","SE","SI","SK","SM","UA","VA","TR", "AZ"
    ],

    // MEA: Middle East + Africa
    MEA: [
      // Middle East
      "AE","BH","IQ","IR","IL","JO","KW","LB","OM","PS","QA","SA","SY","YE",
      // Africa
      "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"
    ],

    // Pacific: South Asia + South Korea + Japan + Australia
    Pacific: [
      // South Asia
      "AF","BD","BT","IN","MV","NP","PK","LK",
      // East Asia + Oceania (as specified)
      "KR","JP","AU","NZ"
    ],

    // Greater China
    "Greater China": ["CN","HK","MO","TW"]
  };

  // Citizens of these countries cannot expand representation via PR outside this set
  var restrictedCitizenshipNoPRExpansion = ["CN","HK","MO","TW"]; // China, Hong Kong, Macao, Chinese Taipei

  // Countries that are tagged to a region but disallowed for representation
  var disallowedRepresentCountries = [
    // Use teamRepresentableCountriesByRegion for region-specific representation rules.
    // Keep this list empty unless you have global disallow rules.
  ];

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

  window.AppConfig = {
    regions: regions,
    restrictedCitizenshipNoPRExpansion: restrictedCitizenshipNoPRExpansion,
    disallowedRepresentCountries: disallowedRepresentCountries,
    getRegionOfCountry: getRegionOfCountry,
    isInRegion: isInRegion,
    teamRepresentationMinByRegion: teamRepresentationMinByRegion,
    getTeamMinPlayersForRegion: getTeamMinPlayersForRegion,
    // Allowed team-representable countries by region (ISO alpha-2)
    teamRepresentableCountriesByRegion: {
      "Southeast Asia": ["MM","KH","LA","SG","TL","BN","ID","MY","PH"],
      Pacific: ["JP","KR","PK","BD","NP","LK","MV","BT","AU","NZ"],
      "Greater China": ["HK", "MO"],
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
      // Examples — replace with your actual events
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
    ]
  };
})();
