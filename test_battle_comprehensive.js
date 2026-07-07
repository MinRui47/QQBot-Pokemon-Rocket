const { Pokemon } = require('./src/game/models');
const { BattleSystem, initBattleConfig } = require('./src/game/battle');
const { GameMap } = require('./src/game/map');
const { database } = require('./src/game/database/dal');
const { pokemonDAL } = require('./src/game/database/dal');

console.log('====================================');
console.log('     宝可梦战斗全面测试');
console.log('====================================\n');

async function runTests() {
  await database.init();
  await initBattleConfig();
  console.log('[测试] 数据库和配置初始化完成\n');

  console.log('【测试1】验证宝可梦技能初始化');
  const testPokemons = ['波波', '小拉达', '绿毛虫', '独角虫', '烈雀', '鲤鱼王', '阿柏蛇'];
  
  for (const name of testPokemons) {
    const p = new Pokemon(name, 5, { isInitial: true });
    console.log(name + ' Lv.5 技能: ' + p.moves.join(', '));
    for (const move of p.moves) {
      const pp = p.getMovePP(move);
      const maxPp = p.getMoveMaxPP(move);
      if (pp === 0) {
        console.log('  WARNING: ' + move + ' PP为0');
      }
    }
  }
  console.log('');

  console.log('【测试2】低级地图宝可梦池验证');
  const map = new GameMap('低级地图');
  console.log('当前宝可梦池(' + map.config.pokemonPool.length + '种):');
  console.log(map.config.pokemonPool.join(', '));
  console.log('');

  console.log('【测试3】随机生成野生宝可梦');
  const encounteredPokemon = [];
  for (let i = 0; i < 20; i++) {
    const wild = map._generateWildPokemon();
    encounteredPokemon.push(wild);
    console.log('#' + (i + 1) + ': ' + wild.name + ' Lv.' + wild.level + ' (' + wild.rarity + ')');
  }
  
  const uniquePokemon = [...new Set(encounteredPokemon.map(p => p.name))];
  console.log('\n20次遭遇中遇到的不同宝可梦(' + uniquePokemon.length + '种):');
  console.log(uniquePokemon.join(', '));
  console.log('');

  console.log('【测试4】多种宝可梦战斗测试');
  const battleResults = [];
  
  const testBattles = [
    { player: '阿柏蛇', playerLv: 8, wild: '波波', wildLv: 6 },
    { player: '阿柏蛇', playerLv: 8, wild: '小拉达', wildLv: 7 },
    { player: '阿柏蛇', playerLv: 8, wild: '绿毛虫', wildLv: 5 },
    { player: '阿柏蛇', playerLv: 8, wild: '独角虫', wildLv: 5 },
    { player: '阿柏蛇', playerLv: 8, wild: '烈雀', wildLv: 6 },
    { player: '阿柏蛇', playerLv: 8, wild: '鲤鱼王', wildLv: 5 },
    { player: '波波', playerLv: 8, wild: '小拉达', wildLv: 7 },
    { player: '波波', playerLv: 8, wild: '绿毛虫', wildLv: 5 },
    { player: '波波', playerLv: 8, wild: '烈雀', wildLv: 6 },
    { player: '小拉达', playerLv: 8, wild: '波波', wildLv: 6 },
    { player: '超音蝠', playerLv: 7, wild: '波波', wildLv: 6 },
    { player: '小拳石', playerLv: 7, wild: '烈雀', wildLv: 5 },
    { player: '喵喵', playerLv: 7, wild: '阿柏蛇', wildLv: 6 },
    { player: '胖丁', playerLv: 6, wild: '小拉达', wildLv: 5 },
    { player: '皮皮', playerLv: 6, wild: '绿毛虫', wildLv: 5 },
    { player: '喇叭芽', playerLv: 7, wild: '鲤鱼王', wildLv: 6 },
    { player: '走路草', playerLv: 7, wild: '独角虫', wildLv: 5 },
    { player: '地鼠', playerLv: 7, wild: '烈雀', wildLv: 5 },
    { player: '穿山鼠', playerLv: 7, wild: '小拉达', wildLv: 6 },
    { player: '尼多兰', playerLv: 6, wild: '波波', wildLv: 5 },
  ];

  for (const { player: playerName, playerLv, wild: wildName, wildLv } of testBattles) {
    const playerPokemon = new Pokemon(playerName, playerLv, { isInitial: true });
    const initialHp = playerPokemon.hp;
    
    const player = {
      currentGame: {
        map: new GameMap('低级地图'),
        belt: { 
          pokemon: [playerPokemon], 
          getActivePokemon: function() { return this.pokemon[0] },
          hasHealthyPokemon: function() { return this.pokemon.some(p => !p.isFainted()) },
          hasAlivePokemon: function() { return this.pokemon.some(p => !p.isFainted()) }
        },
        backpack: {
          items: [],
          findItem: function(name) { return this.items.find(i => i.name === name) },
          removeItem: function(name, qty) {
            const idx = this.items.findIndex(i => i.name === name)
            if (idx !== -1) {
              this.items[idx].quantity -= qty
              if (this.items[idx].quantity <= 0) this.items.splice(idx, 1)
            }
          }
        }
      },
      getObedienceLevel: function() { return 100 }
    };
    
    const battleSystem = new BattleSystem(player);
    const result = await battleSystem.startWildBattle({ name: wildName, level: wildLv });
    
    const won = result.message.includes('胜利');
    const captured = result.message.includes('捕获');
    const expMatch = result.message.match(/获得经验：(\d+)/);
    const expGained = expMatch ? parseInt(expMatch[1]) : 0;
    const damageReceived = initialHp - playerPokemon.hp;
    
    battleResults.push({
      player: playerName + ' Lv.' + playerLv,
      wild: wildName + ' Lv.' + wildLv,
      result: won ? '胜利' : '失败',
      damageReceived: damageReceived,
      expGained: expGained,
      finalHp: playerPokemon.hp + '/' + playerPokemon.maxHp,
      turns: result.turnLog ? result.turnLog.filter(l => l.includes('回合')).length : 0
    });
    
    console.log(playerName + ' Lv.' + playerLv + ' vs ' + wildName + ' Lv.' + wildLv + ': ' + (won ? '胜利' : '失败') + ' | 伤害:' + damageReceived + ' | 经验:' + expGained + ' | HP:' + playerPokemon.hp + '/' + playerPokemon.maxHp);
  }

  console.log('\n【测试5】战斗结果汇总');
  console.log('------------------------------------------------------');
  console.log('对战 | 结果 | 伤害 | 经验 | 剩余HP | 回合数');
  console.log('------------------------------------------------------');
  for (const r of battleResults) {
    console.log(r.player + ' vs ' + r.wild + ' | ' + r.result + ' | ' + r.damageReceived + ' | ' + r.expGained + ' | ' + r.finalHp + ' | ' + r.turns);
  }

  const winRate = (battleResults.filter(r => r.result === '胜利').length / battleResults.length * 100).toFixed(1);
  console.log('------------------------------------------------------');
  console.log('总场次: ' + battleResults.length + ' | 胜率: ' + winRate + '%');
  console.log('');

  console.log('【测试6】验证技能多样性');
  const moveUsage = {};
  for (const r of battleResults) {
    const playerName = r.player.split(' ')[0];
    const p = new Pokemon(playerName, parseInt(r.player.split('Lv.')[1]), { isInitial: true });
    for (const move of p.moves) {
      moveUsage[move] = (moveUsage[move] || 0) + 1;
    }
  }
  
  console.log('测试中涉及的技能(' + Object.keys(moveUsage).length + '种):');
  console.log(Object.keys(moveUsage).sort().join(', '));
  console.log('');

  console.log('====================================');
  console.log('     测试完成！');
  console.log('====================================');
}

runTests().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
