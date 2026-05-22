// NBA Player to Team Mappings (2025-26 Season)
// This file corrects ESPN/Yahoo API errors where players have wrong team codes

export const nbaPlayerTeamMappings: Record<string, string> = {
  // A
  "Precious Achiuwa": "NYK",
  "Bam Adebayo": "MIA",
  "Steven Adams": "HOU",
  "LaMelo Ball": "CHA",
  "Lonzo Ball": "CHI",
  "Paolo Banchero": "ORL",
  "Scottie Barnes": "TOR",
  "Desmond Bane": "MEM",
  "RJ Barrett": "TOR",
  "Keegan Murray": "SAC",
  "Dejounte Murray": "NOP",
  "Jamal Murray": "DEN",
  
  // B
  "Giannis Antetokounmpo": "MIL",
  "OG Anunoby": "NYK",
  "Cole Anthony": "ORL",
  "Carmelo Anthony": "FA",
  
  // C
  "Wendell Carter Jr.": "ORL",
  "Vince Carter": "FA",
  "Alex Caruso": "OKC",
  "Jimmy Butler": "MIA",
  "Jalen Brunson": "NYK",
  "Jaylen Brown": "BOS",
  "Brook Lopez": "MIL",
  "Robin Lopez": "FA",
  
  // D
  "Anthony Davis": "LAL",
  "DeMar DeRozan": "SAC",
  "Luka Doncic": "DAL",
  "Kevin Durant": "PHX",
  "Anthony Edwards": "MIN",
  "Joel Embiid": "PHI",
  "De'Andre Hunter": "ATL",
  
  // F-G
  "Trae Young": "ATL",
  "Kyrie Irving": "DAL",
  "LeBron James": "LAL",
  "Jaren Jackson Jr.": "MEM",
  "Nikola Jokic": "DEN",
  "Nikola Jovic": "MIA",
  "DeAndre Jordan": "FA",
  "Tyrese Haliburton": "IND",
  "James Harden": "LAC",
  "Tyler Herro": "MIA",
  "Buddy Hield": "GSW",
  "Jrue Holiday": "BOS",
  
  // H-K
  "Brandon Ingram": "NOP",
  "Kyrie Irving": "DAL",
  "Jaren Jackson Jr.": "MEM",
  "LeBron James": "LAL",
  "Nikola Jokic": "DEN",
  "Derrick Jones Jr.": "LAC",
  "Tyrese Maxey": "PHI",
  "CJ McCollum": "NOP",
  "Donovan Mitchell": "CLE",
  "Ja Morant": "MEM",
  
  // L-R
  "Kawhi Leonard": "LAC",
  "Damian Lillard": "MIL",
  "Karl-Anthony Towns": "NYK",
  "Myles Turner": "IND",
  "Jonas Valanciunas": "WAS",
  "Nikola Vucevic": "CHI",
  "Russell Westbrook": "DEN",
  "Zion Williamson": "NOP",
  "Trae Young": "ATL",
  "Chet Holmgren": "OKC",
  "Shai Gilgeous-Alexander": "OKC",
  "Darius Garland": "CLE",
  "Evan Mobley": "CLE",
  "Jarrett Allen": "CLE",
  
  // S-Z
  "Alperen Sengun": "HOU",
  "Pascal Siakam": "IND",
  "Ben Simmons": "BKN",
  "Jalen Smith": "CHI",
  "Marcus Smart": "MEM",
  "Jayson Tatum": "BOS",
  "Klay Thompson": "DAL",
  "Myles Turner": "IND",
  "Franz Wagner": "ORL",
  "Derrick White": "BOS",
  "Zion Williamson": "NOP",
  "Jalen Williams": "OKC",
  "Zach LaVine": "CHI",
  "Devin Booker": "PHX",
  "Bradley Beal": "PHX",
  "Chris Paul": "SAS",
  "Draymond Green": "GSW",
  "Stephen Curry": "GSW",
  "Klay Thompson": "DAL",
  "Andrew Wiggins": "GSW",
  "Jordan Poole": "WAS",
  "Kristaps Porzingis": "BOS",
  "Al Horford": "BOS",
  "Derrick White": "BOS",
  "Malcolm Brogdon": "WAS",
  "Tyrese Haliburton": "IND",
  "Bennedict Mathurin": "IND",
  "Obi Toppin": "IND",
  "Buddy Hield": "GSW",
  "Rui Hachimura": "LAL",
  "Austin Reaves": "LAL",
  "D'Angelo Russell": "LAL",
  "Jarred Vanderbilt": "LAL",
  "Christian Wood": "LAL",
  "Paul George": "PHI",
  "Tyrese Maxey": "PHI",
  "Tobias Harris": "DET",
  "Kelly Oubre Jr.": "PHI",
  "Nicolas Batum": "LAC",
  "Kawhi Leonard": "LAC",
  "Paul George": "PHI",
  "Russell Westbrook": "DEN",
  "Norman Powell": "LAC",
  "Ivica Zubac": "LAC",
  "Bones Hyland": "LAC",
  "Victor Wembanyama": "SAS",
  "Devin Vassell": "SAS",
  "Keldon Johnson": "SAS",
  "Jeremy Sochan": "SAS",
  "Tre Jones": "SAS",
  "Lauri Markkanen": "UTA",
  "Jordan Clarkson": "UTA",
  "Collin Sexton": "UTA",
  "Walker Kessler": "UTA",
  "John Collins": "UTA",
  "Scoot Henderson": "POR",
  "Anfernee Simons": "POR",
  "Jerami Grant": "POR",
  "Deandre Ayton": "POR",
  "Shaedon Sharpe": "POR",
  "Brandon Miller": "CHA",
  "Miles Bridges": "CHA",
  "Terry Rozier": "MIA",
  "Gordon Hayward": "OKC",
  "Cade Cunningham": "DET",
  "Jaden Ivey": "DET",
  "Ausar Thompson": "DET",
  "Isaiah Stewart": "DET",
  "Jalen Duren": "DET",
  "Bojan Bogdanovic": "BKN",
  "Marcus Sasser": "DET",
  "Killian Hayes": "BKN"
}

// Common misspellings or variations
export const playerNameAliases: Record<string, string> = {
  "Luka Dončić": "Luka Doncic",
  "Nikola Jović": "Nikola Jovic",
  "Nikola Jokić": "Nikola Jokic",
  "Alperen Şengün": "Alperen Sengun",
  "Bogdan Bogdanović": "Bogdan Bogdanovic",
  "Bojan Bogdanović": "Bojan Bogdanovic",
  "Dāvis Bertāns": "Davis Bertans",
  "Kristaps Porziņģis": "Kristaps Porzingis",
  "Goran Dragić": "Goran Dragic",
  "Nikola Vučević": "Nikola Vucevic",
  "Jusuf Nurkić": "Jusuf Nurkic",
  "Dario Šarić": "Dario Saric",
  "Ivica Zubac": "Ivica Zubac"
}

// Team code corrections (ESPN sometimes uses wrong codes)
export const teamCodeCorrections: Record<string, string> = {
  // NFL codes that should be NBA
  "PIT": null, // Pittsburgh is not NBA
  "TEN": null, // Tennessee is not NBA
  "CAR": null, // Carolina is not NBA
  "LAR": "LAL", // LA Rams -> Lakers (if context is basketball)
  "NE": null, // New England is not NBA
  "SF": "GSW", // San Francisco -> Warriors
  "FA": null, // Free Agent
  
  // Common NBA abbreviation variations
  "BRK": "BKN",
  "PHO": "PHX",
  "SA": "SAS",
  "NO": "NOP",
  "GS": "GSW",
  "NY": "NYK"
}
