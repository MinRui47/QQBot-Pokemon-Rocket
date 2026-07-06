// 火箭队军衔系统 v2

const RANKS = [
  {
    id: '火箭队炮灰',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [0, 2501, 5001, 7501],
    maxThreshold: 10000,
    buffs: [
      { sellPriceBonus: 0.01, escapeRate: 0.02 },
      { sellPriceBonus: 0.015, escapeRate: 0.03 },
      { sellPriceBonus: 0.02, escapeRate: 0.04 },
      { sellPriceBonus: 0.03, escapeRate: 0.05 }
    ],
    dailySignIn: [
      { gold: 50, items: [{ name: '普通精灵球', quantity: 1 }] },
      { gold: 80, items: [{ name: '普通精灵球', quantity: 2 }] },
      { gold: 120, items: [{ name: '普通精灵球', quantity: 2 }, { name: '解毒药', quantity: 1 }] },
      { gold: 100, items: [{ name: '普通精灵球', quantity: 2 }] }
    ]
  },
  {
    id: '火箭队见习队员',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [10001, 20001, 30001, 40001],
    maxThreshold: 50000,
    buffs: [
      { sellPriceBonus: 0.035, escapeRate: 0.06 },
      { sellPriceBonus: 0.04, escapeRate: 0.07 },
      { sellPriceBonus: 0.045, escapeRate: 0.09 },
      { sellPriceBonus: 0.05, escapeRate: 0.10, poisonPowerBonus: 0.02 }
    ],
    dailySignIn: [
      { gold: 150, items: [{ name: '普通精灵球', quantity: 3 }] },
      { gold: 200, items: [{ name: '普通精灵球', quantity: 4 }] },
      { gold: 260, items: [{ name: '普通精灵球', quantity: 4 }, { name: '解毒药', quantity: 2 }] },
      { gold: 300, items: [{ name: '普通精灵球', quantity: 5 }, { name: '解毒药', quantity: 2 }] }
    ]
  },
  {
    id: '火箭队正式队员',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [50001, 87501, 125001, 162501],
    maxThreshold: 200000,
    buffs: [
      { sellPriceBonus: 0.06, darkPoisonPowerBonus: 0.025 },
      { sellPriceBonus: 0.068, darkPoisonPowerBonus: 0.03 },
      { sellPriceBonus: 0.074, darkPoisonPowerBonus: 0.035 },
      { sellPriceBonus: 0.08, darkPoisonPowerBonus: 0.04, captureRateBonus: 0.03 }
    ],
    dailySignIn: [
      { gold: 400, items: [{ name: '超级球', quantity: 2 }] },
      { gold: 550, items: [{ name: '超级球', quantity: 2 }, { name: '解毒药', quantity: 3 }] },
      { gold: 680, items: [{ name: '超级球', quantity: 3 }] },
      { gold: 800, items: [{ name: '超级球', quantity: 3 }, { name: '解毒药', quantity: 5 }] }
    ]
  },
  {
    id: '火箭队小队长',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [200001, 350001, 500001, 650001],
    maxThreshold: 800000,
    buffs: [
      { sellPriceBonus: 0.09, triplePowerBonus: 0.05 },
      { sellPriceBonus: 0.10, triplePowerBonus: 0.058 },
      { sellPriceBonus: 0.11, triplePowerBonus: 0.064 },
      { sellPriceBonus: 0.12, triplePowerBonus: 0.07, rareCaptureBonus: 0.05 }
    ],
    dailySignIn: [
      { gold: 1000, items: [{ name: '超级球', quantity: 4 }] },
      { gold: 1300, items: [{ name: '超级球', quantity: 5 }, { name: '高级球', quantity: 1 }] },
      { gold: 1600, items: [{ name: '超级球', quantity: 5 }, { name: '高级球', quantity: 1 }, { name: '全回复药', quantity: 2 }] },
      { gold: 2000, items: [{ name: '超级球', quantity: 6 }, { name: '高级球', quantity: 2 }, { name: '全回复药', quantity: 3 }] }
    ]
  },
  {
    id: '火箭队精英队员',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [800001, 1350001, 1900001, 2450001],
    maxThreshold: 3000000,
    buffs: [
      { sellPriceBonus: 0.14, triplePowerBonus: 0.075, shinyRateBonus: 0.005 },
      { sellPriceBonus: 0.15, triplePowerBonus: 0.08, shinyRateBonus: 0.01 },
      { sellPriceBonus: 0.165, triplePowerBonus: 0.085, shinyRateBonus: 0.015 },
      { sellPriceBonus: 0.18, triplePowerBonus: 0.09, shinyRateBonus: 0.02, allCaptureBonus: 0.04 }
    ],
    dailySignIn: [
      { gold: 2600, items: [{ name: '高级球', quantity: 3 }, { name: '黑暗球', quantity: 1 }] },
      { gold: 3200, items: [{ name: '高级球', quantity: 3 }, { name: '黑暗球', quantity: 2 }] },
      { gold: 4000, items: [{ name: '高级球', quantity: 4 }, { name: '黑暗球', quantity: 2 }, { name: '全回复药', quantity: 4 }] },
      { gold: 5000, items: [{ name: '高级球', quantity: 5 }, { name: '黑暗球', quantity: 3 }, { name: '全回复药', quantity: 5 }] }
    ]
  },
  {
    id: '火箭队高级干部',
    subTiers: ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'],
    thresholds: [3000001, 4750001, 6500001, 8250001],
    maxThreshold: 10000000,
    buffs: [
      { sellPriceBonus: 0.20, triplePowerBonus: 0.092, shinyRateBonus: 0.03, allCaptureBonus: 0.06 },
      { sellPriceBonus: 0.22, triplePowerBonus: 0.095, shinyRateBonus: 0.04, allCaptureBonus: 0.08 },
      { sellPriceBonus: 0.235, triplePowerBonus: 0.098, shinyRateBonus: 0.05, allCaptureBonus: 0.10 },
      { sellPriceBonus: 0.25, triplePowerBonus: 0.10, shinyRateBonus: 0.06, allCaptureBonus: 0.12 }
    ],
    dailySignIn: [
      { gold: 6500, items: [{ name: '高级球', quantity: 6 }, { name: '黑暗球', quantity: 4 }] },
      { gold: 8000, items: [{ name: '高级球', quantity: 6 }, { name: '黑暗球', quantity: 4 }, { name: '大师碎片', quantity: 1 }] },
      { gold: 10000, items: [{ name: '高级球', quantity: 7 }, { name: '黑暗球', quantity: 5 }, { name: '大师碎片', quantity: 1 }, { name: '全回复药', quantity: 8 }] },
      { gold: 12000, items: [{ name: '高级球', quantity: 8 }, { name: '黑暗球', quantity: 6 }, { name: '大师碎片', quantity: 2 }, { name: '全回复药', quantity: 10 }] }
    ]
  },
  {
    id: '火箭队总帅',
    subTiers: [''],
    thresholds: [10000001],
    maxThreshold: Infinity,
    buffs: [
      { sellPriceBonus: 0.35, triplePowerBonus: 0.12, shinyRateBonus: 0.10, allCaptureBonus: 0.20 }
    ],
    dailySignIn: [
      { gold: 30000, items: [{ name: '黑暗球', quantity: 10 }, { name: '大师碎片', quantity: 5 }, { name: '全回复药', quantity: 20 }, { name: '随机黑市稀有道具', quantity: 1 }] }
    ]
  }
]

function getRankInfo(totalValue) {
  for (const rank of RANKS) {
    for (let i = rank.subTiers.length - 1; i >= 0; i--) {
      if (totalValue >= rank.thresholds[i]) {
        const subLabel = rank.subTiers[i]
        return {
          title: `${rank.id} ${subLabel}`.trim(),
          rankId: rank.id,
          subIndex: i,
          buffs: rank.buffs[i],
          dailySignIn: rank.dailySignIn[i],
          nextThreshold: i < rank.subTiers.length - 1 ? rank.thresholds[i + 1] : rank.maxThreshold,
          isMaxRank: rank.id === '火箭队总帅'
        }
      }
    }
  }
  // 默认：炮灰Ⅳ
  return {
    title: '火箭队炮灰 Ⅳ',
    rankId: '火箭队炮灰',
    subIndex: 0,
    buffs: RANKS[0].buffs[0],
    dailySignIn: RANKS[0].dailySignIn[0],
    nextThreshold: RANKS[0].thresholds[1] || RANKS[0].maxThreshold,
    isMaxRank: false
  }
}

function getRankTitle(totalValue) {
  return getRankInfo(totalValue).title
}

function getAllRanks() {
  return RANKS
}

module.exports = { RANKS, getRankInfo, getRankTitle, getAllRanks }
