const { MEDALS } = require('../map')

const TASK_TYPES = {
  SCOUT: {
    name: '搜刮任务',
    description: '收集指定数量的物资',
    targets: [
      { item: '普通精灵球', count: 5, reward: { money: 100, warehouseSlots: 1 } },
      { item: '超级球', count: 3, reward: { money: 200, warehouseSlots: 2 } },
      { item: '伤药', count: 8, reward: { money: 150, warehouseSlots: 1 } }
    ]
  },
  CLEAR: {
    name: '清缴任务',
    description: '击败指定数量的野生宝可梦',
    targets: [
      { count: 3, reward: { money: 150, backpackFragment: 1 } },
      { count: 5, reward: { money: 300, backpackFragment: 2 } }
    ]
  },
  RAID: {
    name: '劫掠道馆任务',
    description: '击败道馆训练家并抢夺物资',
    reward: { money: 500, medalFragment: 1 }
  },
  EXPLORE: {
    name: '探查金色点位任务',
    description: '发现并探索金色高价值点位',
    reward: { money: 400, warehouseSlots: 3 }
  }
}

class Task {
  constructor(type) {
    this.type = type
    this.config = TASK_TYPES[type]
    this.name = this.config.name
    this.description = this.config.description
    this.progress = 0
    this.target = this._selectTarget()
    this.completed = false
  }
  
  _selectTarget() {
    if (this.type === 'SCOUT') {
      return this.config.targets[Math.floor(Math.random() * this.config.targets.length)]
    }
    if (this.type === 'CLEAR') {
      return this.config.targets[Math.floor(Math.random() * this.config.targets.length)]
    }
    return this.config.reward
  }
  
  updateProgress(value) {
    if (this.completed) return
    
    this.progress += value
    
    if (this.target.count && this.progress >= this.target.count) {
      this.completed = true
    } else if (this.type === 'RAID' && value > 0) {
      this.completed = true
    } else if (this.type === 'EXPLORE' && value > 0) {
      this.completed = true
    }
  }
  
  getReward() {
    return this.target.reward || this.target
  }
  
  getProgressText() {
    if (this.completed) return '已完成'
    if (this.type === 'SCOUT') return `${this.progress}/${this.target.count} ${this.target.item}`
    if (this.type === 'CLEAR') return `${this.progress}/${this.target.count} 野生宝可梦`
    return '进行中'
  }
  
  toJSON() {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      progress: this.progress,
      target: this.target,
      completed: this.completed
    }
  }
  
  static fromJSON(data) {
    const task = new Task(data.type)
    task.progress = data.progress
    task.target = data.target
    task.completed = data.completed
    return task
  }
}

class TaskSystem {
  constructor() {
    this.tasks = []
  }
  
  generateTasks(count = 2) {
    this.tasks = []
    const types = Object.keys(TASK_TYPES)
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      this.tasks.push(new Task(type))
    }
    
    return this.tasks
  }
  
  updateTasks(type, value = 1) {
    for (const task of this.tasks) {
      if (!task.completed) {
        if ((type === 'SCOUT' && task.type === 'SCOUT') ||
            (type === 'CLEAR' && task.type === 'CLEAR') ||
            (type === 'RAID' && task.type === 'RAID') ||
            (type === 'EXPLORE' && task.type === 'EXPLORE')) {
          task.updateProgress(value)
        }
      }
    }
  }
  
  getCompletedTasks() {
    return this.tasks.filter(t => t.completed)
  }
  
  getAllRewards() {
    const rewards = { money: 0, warehouseSlots: 0, backpackFragment: 0, medalFragment: 0 }
    
    for (const task of this.tasks) {
      if (task.completed) {
        const reward = task.getReward()
        rewards.money += reward.money || 0
        rewards.warehouseSlots += reward.warehouseSlots || 0
        rewards.backpackFragment += reward.backpackFragment || 0
        rewards.medalFragment += reward.medalFragment || 0
      }
    }
    
    return rewards
  }
  
  getTasksInfo() {
    return this.tasks.map(task => ({
      name: task.name,
      description: task.description,
      progress: task.getProgressText(),
      completed: task.completed
    }))
  }
  
  toJSON() {
    return {
      tasks: this.tasks.map(t => t.toJSON())
    }
  }
  
  static fromJSON(data) {
    const ts = new TaskSystem()
    ts.tasks = data.tasks.map(t => Task.fromJSON(t))
    return ts
  }
}

class MedalSystem {
  constructor(player) {
    this.player = player
  }
  
  getObedienceLevel() {
    const medalCount = this.player.medals.length
    if (medalCount >= 8) return 100
    return medalCount * 10
  }
  
  canControlPokemon(level) {
    return level <= this.getObedienceLevel()
  }
  
  addMedal(medalName) {
    if (!MEDALS.includes(medalName)) {
      return { success: false, message: '无效的勋章' }
    }
    
    if (this.player.medals.includes(medalName)) {
      return { success: false, message: '已拥有该勋章' }
    }
    
    this.player.addMedal(medalName)
    
    return { success: true, message: `\u83B7\u5F97\u9053\u9986\u52CB\u7AE0：${medalName}！\n\u73B0\u5728\u53EF\u4EE5\u63A7\u5236\uFF1A${this.getObedienceLevel()}级以下精灵` }
  }
  
  getMedalInfo() {
    const info = []
    for (const medal of MEDALS) {
      info.push({
        name: medal,
        owned: this.player.medals.includes(medal)
      })
    }
    return info
  }
  
  getObedienceInfo() {
    const level = this.getObedienceLevel()
    return {
      medalCount: this.player.medals.length,
      obedienceLevel: level,
      description: this._getObedienceDescription(level)
    }
  }
  
  _getObedienceDescription(level) {
    if (level >= 100) return '全等级无条件服从'
    return `${level}级以下精灵听话`
  }
}

module.exports = {
  TaskSystem,
  Task,
  MedalSystem,
  TASK_TYPES,
  MEDALS
}