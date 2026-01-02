(function(){
  // Extra territories or special cases not reliably returned by RestCountries
  // Each item: { code: 'ISO alpha-2', name: 'Display Name' }
  window.EXTRA_COUNTRIES = [
    { code: 'AX', name: 'Åland Islands' },
    { code: 'FO', name: 'Faroe Islands' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    { code: 'GG', name: 'Guernsey' },
    { code: 'JE', name: 'Jersey' },
    { code: 'IM', name: 'Isle of Man' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'XK', name: 'Kosovo' },
    { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
    { code: 'CW', name: 'Curaçao' },
    { code: 'SX', name: 'Sint Maarten (Dutch part)' },
    { code: 'MF', name: 'Saint Martin (French part)' },
    { code: 'GF', name: 'French Guiana' },
    { code: 'MQ', name: 'Martinique' },
    { code: 'GP', name: 'Guadeloupe' },
    { code: 'TC', name: 'Turks and Caicos Islands' },
    { code: 'AW', name: 'Aruba' },
    { code: 'AI', name: 'Anguilla' },
    { code: 'KY', name: 'Cayman Islands' },
    { code: 'BM', name: 'Bermuda' },
    { code: 'VI', name: 'Virgin Islands (U.S.)' },
    { code: 'VG', name: 'Virgin Islands (British)' },
    { code: 'DM', name: 'Dominica' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'GD', name: 'Grenada' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'CN', name: 'Mainland China' },
    { code: 'HK', name: 'Hong Kong, China' },
    { code: 'MO', name: 'Macau, China' },
    { code: 'TW', name: 'Chinese Taipei' }
  ];
})();
