const { database } = require('./src/game/database/dal');

async function test() {
  await database.init();
  
  console.log('=== 第一世代宝可梦列表(按属性分类) ===');
  
  const types = ['一般', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢'];
  
  for (const type of types) {
    const pokemons = database.all("SELECT name, pokedex_id, type1, type2 FROM pokemons WHERE pokedex_id LIKE '#0%' AND (type1 = ? OR type2 = ?) ORDER BY pokedex_id", [type, type]);
    if (pokemons.length > 0) {
      console.log('\n[' + type + '] (' + pokemons.length + '种):');
      pokemons.forEach(p => {
        console.log('  ' + p.pokedex_id + ' ' + p.name);
      });
    }
  }
  
  console.log('\n=== 适合低级地图的宝可梦(第一世代初期) ===');
  const earlyPokemon = database.all("SELECT name, pokedex_id, type1, type2, hp_base, attack_base, defense_base, speed_base FROM pokemons WHERE pokedex_id LIKE '#0%' AND pokedex_id <= '#0050' ORDER BY pokedex_id");
  console.log('ID | 名称 | 属性 | HP | 攻击 | 防御 | 速度');
  console.log('---|------|------|-----|------|------|-----');
  earlyPokemon.forEach(p => {
    console.log(p.pokedex_id + ' | ' + p.name + ' | ' + p.type1 + (p.type2 ? '/' + p.type2 : '') + ' | ' + p.hp_base + ' | ' + p.attack_base + ' | ' + p.defense_base + ' | ' + p.speed_base);
  });
}

test().catch(err => console.error(err));
