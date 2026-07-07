const { database } = require('./src/game/database/dal');

async function test() {
  await database.init();
  
  console.log('=== 第一世代宝可梦统计 ===');
  const gen1Pokemons = database.all("SELECT * FROM pokemons WHERE pokedex_id LIKE '#0%' ORDER BY pokedex_id");
  console.log('第一世代宝可梦数量:', gen1Pokemons.length);
  
  console.log('\n前20只第一世代宝可梦:');
  gen1Pokemons.slice(0, 20).forEach(p => {
    console.log('  ' + p.pokedex_id + ' ' + p.name + ' (' + p.type1 + (p.type2 ? '/' + p.type2 : '') + ')');
  });
  
  console.log('\n=== 技能数据统计 ===');
  const moves = database.all('SELECT * FROM moves');
  console.log('技能总数:', moves.length);
  
  console.log('\n=== 波波的技能学习情况 ===');
  const pidgeyMoves = database.all("SELECT * FROM pokemon_level_moves WHERE pokemon_id = (SELECT id FROM pokemons WHERE name = '波波') ORDER BY level");
  console.log('波波可学习技能:', pidgeyMoves.length, '个');
  pidgeyMoves.forEach(m => {
    console.log('  Lv.' + m.level + ': ' + m.move_name);
  });
  
  console.log('\n=== 阿柏蛇的技能学习情况 ===');
  const ekansMoves = database.all("SELECT * FROM pokemon_level_moves WHERE pokemon_id = (SELECT id FROM pokemons WHERE name = '阿柏蛇') ORDER BY level");
  console.log('阿柏蛇可学习技能:', ekansMoves.length, '个');
  ekansMoves.forEach(m => {
    console.log('  Lv.' + m.level + ': ' + m.move_name);
  });
  
  console.log('\n=== 绿毛虫的技能学习情况 ===');
  const caterpieMoves = database.all("SELECT * FROM pokemon_level_moves WHERE pokemon_id = (SELECT id FROM pokemons WHERE name = '绿毛虫') ORDER BY level");
  console.log('绿毛虫可学习技能:', caterpieMoves.length, '个');
  caterpieMoves.forEach(m => {
    console.log('  Lv.' + m.level + ': ' + m.move_name);
  });
  
  console.log('\n=== 小拉达的技能学习情况 ===');
  const rattataMoves = database.all("SELECT * FROM pokemon_level_moves WHERE pokemon_id = (SELECT id FROM pokemons WHERE name = '小拉达') ORDER BY level");
  console.log('小拉达可学习技能:', rattataMoves.length, '个');
  rattataMoves.forEach(m => {
    console.log('  Lv.' + m.level + ': ' + m.move_name);
  });
  
  console.log('\n=== 当前低级地图的宝可梦池 ===');
  const { GameMap } = require('./src/game/map');
  const map = new GameMap('低级地图');
  console.log('宝可梦池:', map.config.pokemonPool);
}

test().catch(err => console.error(err));
