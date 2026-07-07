const { database } = require('./src/game/database/dal');

async function test() {
  await database.init();
  
  const sample = database.all('SELECT * FROM pokemon_level_moves LIMIT 5');
  console.log('pokemon_level_moves 表结构示例:');
  sample.forEach((row, i) => {
    console.log('Row ' + i + ':');
    Object.keys(row).forEach(key => {
      console.log('  ' + key + ': ' + row[key]);
    });
    console.log('');
  });
  
  const pidgeyRow = database.get("SELECT id FROM pokemons WHERE name = '波波'");
  console.log('波波ID:', pidgeyRow ? pidgeyRow.id : 'NOT FOUND');
  
  if (pidgeyRow) {
    const pidgeyMoves = database.all('SELECT * FROM pokemon_level_moves WHERE pokemon_id = ? LIMIT 5', [pidgeyRow.id]);
    console.log('\n波波的技能记录:');
    pidgeyMoves.forEach((row, i) => {
      console.log('Row ' + i + ':');
      Object.keys(row).forEach(key => {
        console.log('  ' + key + ': ' + row[key]);
      });
      console.log('');
    });
  }
  
  console.log('\n=== moves表结构 ===');
  const moveSample = database.all('SELECT * FROM moves LIMIT 3');
  moveSample.forEach((row, i) => {
    console.log('Move ' + i + ':');
    Object.keys(row).forEach(key => {
      console.log('  ' + key + ': ' + row[key]);
    });
    console.log('');
  });
  
  const pidgeyMoveNames = database.all("SELECT plm.*, m.name as move_name FROM pokemon_level_moves plm JOIN moves m ON plm.move_id = m.id WHERE plm.pokemon_id = (SELECT id FROM pokemons WHERE name = '波波') ORDER BY plm.level LIMIT 10");
  console.log('\n波波的技能名称(JOIN后):');
  pidgeyMoveNames.forEach(m => {
    console.log('  Lv.' + m.level + ': ' + m.move_name);
  });
}

test().catch(err => console.error(err));
