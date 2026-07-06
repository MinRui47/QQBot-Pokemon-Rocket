const { pokemonDAL } = require('./database/dal')

function getPokemonRarity(name) {
  const pokemon = pokemonDAL.getPokemonByName(name)
  if (!pokemon) return 'common'
  
  const legendary = pokemon.legendaryCategory
  if (legendary === 'legendary' || legendary === 'mythical') return 'legendary'
  if (legendary === 'pseudo_legendary') return 'epic'
  
  return 'common'
}

function getPokemonData(name) {
  return pokemonDAL.getPokemonByName(name) || null
}

module.exports = {
  getPokemonRarity,
  getPokemonData
}