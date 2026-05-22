/**
 * Platform Adapters
 * 
 * Functions to normalize data from different fantasy platforms
 * into unified data structures.
 */

export {
  // Team adapters
  normalizeSleeperTeam,
  normalizeYahooTeam,
  normalizeEspnTeam,
  
  // Matchup adapters
  normalizeSleeperMatchups,
  normalizeYahooPointsMatchups,
  normalizeYahooCategoryMatchups,
  normalizeEspnPointsMatchups,
  normalizeEspnCategoryMatchups,
  
  // Standings adapters
  normalizeSleeperStandings,
  normalizeYahooStandings,
  normalizeEspnStandings,
  
  // Player adapters
  normalizeSleeperPlayer,
  normalizeYahooPlayer,
  normalizeEspnPlayer,
  
  // Universal adapters
  normalizeMatchups,
  normalizeStandings,
  
  // Types
  type AdapterOptions,
} from './unifiedAdapter'
