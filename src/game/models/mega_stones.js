const MEGA_STONES = {
  '喷火龙X超级进化石': {
    pokemon: '喷火龙',
    name: '喷火龙X超级进化石',
    stone: '喷火石X',
    types: ['火', '龙'],
    baseStats: { HP: 78, 攻击: 130, 防御: 111, 特攻: 130, 特防: 85, 速度: 100 },
    description: '喷火龙超级进化为X形态'
  },
  '喷火龙Y超级进化石': {
    pokemon: '喷火龙',
    name: '喷火龙Y超级进化石',
    stone: '喷火石Y',
    types: ['火', '飞行'],
    baseStats: { HP: 78, 攻击: 104, 防御: 78, 特攻: 159, 特防: 115, 速度: 100 },
    description: '喷火龙超级进化为Y形态'
  },
  '水箭龟超级进化石': {
    pokemon: '水箭龟',
    name: '水箭龟超级进化石',
    stone: '水箭石',
    types: ['水'],
    baseStats: { HP: 79, 攻击: 103, 防御: 120, 特攻: 135, 特防: 115, 速度: 78 },
    description: '水箭龟超级进化'
  },
  '妙蛙花超级进化石': {
    pokemon: '妙蛙花',
    name: '妙蛙花超级进化石',
    stone: '妙蛙石',
    types: ['草', '毒'],
    baseStats: { HP: 80, 攻击: 82, 防御: 83, 特攻: 135, 特防: 110, 速度: 80 },
    description: '妙蛙花超级进化'
  },
  '雷丘超级进化石': {
    pokemon: '雷丘',
    name: '雷丘超级进化石',
    stone: '雷丘石',
    types: ['电'],
    baseStats: { HP: 60, 攻击: 75, 防御: 80, 特攻: 130, 特防: 80, 速度: 150 },
    description: '雷丘超级进化'
  },
  '九尾超级进化石': {
    pokemon: '九尾',
    name: '九尾超级进化石',
    stone: '九尾石',
    types: ['火'],
    baseStats: { HP: 73, 攻击: 76, 防御: 75, 特攻: 130, 特防: 120, 速度: 100 },
    description: '九尾超级进化'
  },
  '胡地超级进化石': {
    pokemon: '胡地',
    name: '胡地超级进化石',
    stone: '胡地石',
    types: ['超能力'],
    baseStats: { HP: 55, 攻击: 50, 防御: 65, 特攻: 175, 特防: 105, 速度: 150 },
    description: '胡地超级进化'
  },
  '耿鬼超级进化石': {
    pokemon: '耿鬼',
    name: '耿鬼超级进化石',
    stone: '耿鬼石',
    types: ['幽灵', '毒'],
    baseStats: { HP: 60, 攻击: 65, 防御: 80, 特攻: 170, 特防: 95, 速度: 130 },
    description: '耿鬼超级进化'
  },
  '快龙超级进化石': {
    pokemon: '快龙',
    name: '快龙超级进化石',
    stone: '快龙石',
    types: ['龙', '飞行'],
    baseStats: { HP: 91, 攻击: 164, 防御: 115, 特攻: 130, 特防: 110, 速度: 100 },
    description: '快龙超级进化'
  },
  '暴鲤龙超级进化石': {
    pokemon: '暴鲤龙',
    name: '暴鲤龙超级进化石',
    stone: '暴鲤石',
    types: ['水', '飞行'],
    baseStats: { HP: 95, 攻击: 155, 防御: 109, 特攻: 70, 特防: 130, 速度: 81 },
    description: '暴鲤龙超级进化'
  },
  '卡比兽超级进化石': {
    pokemon: '卡比兽',
    name: '卡比兽超级进化石',
    stone: '卡比石',
    types: ['一般'],
    baseStats: { HP: 160, 攻击: 110, 防御: 95, 特攻: 65, 特防: 110, 速度: 30 },
    description: '卡比兽超级进化'
  },
  '化石翼龙超级进化石': {
    pokemon: '化石翼龙',
    name: '化石翼龙超级进化石',
    stone: '化石石',
    types: ['岩石', '飞行'],
    baseStats: { HP: 80, 攻击: 135, 防御: 80, 特攻: 70, 特防: 95, 速度: 150 },
    description: '化石翼龙超级进化'
  },
  '大比鸟超级进化石': {
    pokemon: '大比鸟',
    name: '大比鸟超级进化石',
    stone: '大比石',
    types: ['一般', '飞行'],
    baseStats: { HP: 83, 攻击: 80, 防御: 75, 特攻: 70, 特防: 70, 速度: 121 },
    description: '大比鸟超级进化'
  },
  '凯罗斯超级进化石': {
    pokemon: '凯罗斯',
    name: '凯罗斯超级进化石',
    stone: '凯罗斯石',
    types: ['虫'],
    baseStats: { HP: 80, 攻击: 185, 防御: 115, 特攻: 40, 特防: 105, 速度: 75 },
    description: '凯罗斯超级进化'
  },
  '飞天螳螂超级进化石': {
    pokemon: '飞天螳螂',
    name: '飞天螳螂超级进化石',
    stone: '飞天石',
    types: ['虫', '飞行'],
    baseStats: { HP: 70, 攻击: 150, 防御: 110, 特攻: 55, 特防: 100, 速度: 145 },
    description: '飞天螳螂超级进化'
  },
  '隆隆岩超级进化石': {
    pokemon: '隆隆岩',
    name: '隆隆岩超级进化石',
    stone: '隆隆石',
    types: ['岩石', '地面'],
    baseStats: { HP: 80, 攻击: 130, 防御: 165, 特攻: 65, 特防: 90, 速度: 65 },
    description: '隆隆岩超级进化'
  },
  '蚊香泳士超级进化石': {
    pokemon: '蚊香泳士',
    name: '蚊香泳士超级进化石',
    stone: '蚊香石',
    types: ['水', '格斗'],
    baseStats: { HP: 80, 攻击: 100, 防御: 90, 特攻: 80, 特防: 90, 速度: 70 },
    description: '蚊香泳士超级进化'
  },
  '怪力超级进化石': {
    pokemon: '怪力',
    name: '怪力超级进化石',
    stone: '怪力石',
    types: ['格斗'],
    baseStats: { HP: 90, 攻击: 160, 防御: 80, 特攻: 50, 特防: 80, 速度: 75 },
    description: '怪力超级进化'
  },
  '大针蜂超级进化石': {
    pokemon: '大针蜂',
    name: '大针蜂超级进化石',
    stone: '大针石',
    types: ['虫', '毒'],
    baseStats: { HP: 65, 攻击: 150, 防御: 40, 特攻: 15, 特防: 80, 速度: 145 },
    description: '大针蜂超级进化'
  }
}

module.exports = MEGA_STONES
