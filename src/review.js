/**
 * 数据审查工具：检查所有宝可梦缓存数据的完整性和合理性
 */
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data', 'pokemon')

// 合法属性列表
const VALID_TYPES = ['一般', '火', '水', '草', '电', '冰', '虫', '飞行', '毒', '地面',
  '格斗', '超能力', '岩石', '幽灵', '龙', '恶', '钢', '妖精']

// 检查项
const issues = {
  missingTypes: [],        // 缺少属性
  invalidTypes: [],        // 非法属性
  missingAbilities: [],    // 缺少特性
  missingStats: [],        // 缺少种族值
  invalidStatTotal: [],    // 种族值总和不合理
  missingEvolution: [],    // 缺少进化链（非最终进化型）
  missingFlavorText: [],   // 缺少图鉴简介
  emptyForms: [],          // 形态数据为空
  traditionalTypes: []     // 繁体属性
}

// 繁体属性关键词
const TRADITIONAL_KEYWORDS = ['飛', '靈', '龍', '陽', '紅', '藍', '劍', '惡', '鋼', '鬥', '蟲']

function isTraditional(t) {
  return TRADITIONAL_KEYWORDS.some(k => t.includes(k))
}

function reviewAll() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`开始审查 ${files.length} 个宝可梦数据...\n`)

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      const name = data.name || file

      // 1. 检查属性
      if (!data.types || data.types.length === 0) {
        issues.missingTypes.push(name)
      } else {
        for (const t of data.types) {
          if (!VALID_TYPES.includes(t)) {
            issues.invalidTypes.push(`${name}: ${t}`)
          }
          if (isTraditional(t)) {
            issues.traditionalTypes.push(`${name}: ${t}`)
          }
        }
      }

      // 2. 检查特性
      if (!data.abilities || data.abilities.length === 0) {
        issues.missingAbilities.push(name)
      }

      // 3. 检查种族值
      if (!data.stats || Object.keys(data.stats).length < 6) {
        issues.missingStats.push(name)
      } else {
        // 检查种族值总和
        const total = Object.values(data.stats).reduce((a, b) => a + (Number(b) || 0), 0)
        if (data.statTotal && Math.abs(total - data.statTotal) > 5) {
          issues.invalidStatTotal.push(`${name}: 计算${total} vs 记录${data.statTotal}`)
        }
        // 种族值合理性检查（单项应在1-255之间）
        for (const [key, val] of Object.entries(data.stats)) {
          const num = Number(val)
          if (isNaN(num) || num < 1 || num > 255) {
            issues.invalidStatTotal.push(`${name}: ${key}=${val}`)
          }
        }
      }

      // 4. 检查图鉴简介
      if (!data.flavorText || data.flavorText.length < 10) {
        issues.missingFlavorText.push(name)
      }

      // 5. 检查形态数据
      if (data.forms && data.forms.length > 0) {
        for (const form of data.forms) {
          if (!form.types || form.types.length === 0) {
            issues.emptyForms.push(`${name} - ${form.name}`)
          }
          if (!form.stats || Object.keys(form.stats).length < 6) {
            issues.emptyForms.push(`${name} - ${form.name} (缺少种族值)`)
          }
          // 检查形态属性是否为繁体
          if (form.types) {
            for (const t of form.types) {
              if (isTraditional(t)) {
                issues.traditionalTypes.push(`${name}(${form.name}): ${t}`)
              }
            }
          }
        }
      }

    } catch (e) {
      console.error(`读取失败: ${file} - ${e.message}`)
    }
  }

  // 输出报告
  console.log('===== 数据审查报告 =====\n')

  console.log(`缺少属性: ${issues.missingTypes.length}`)
  if (issues.missingTypes.length > 0 && issues.missingTypes.length <= 20) {
    issues.missingTypes.forEach(n => console.log(`  - ${n}`))
  }

  console.log(`\n非法属性: ${issues.invalidTypes.length}`)
  issues.invalidTypes.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n繁体属性: ${issues.traditionalTypes.length}`)
  issues.traditionalTypes.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n缺少特性: ${issues.missingAbilities.length}`)
  issues.missingAbilities.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n缺少种族值: ${issues.missingStats.length}`)
  issues.missingStats.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n种族值异常: ${issues.invalidStatTotal.length}`)
  issues.invalidStatTotal.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n缺少图鉴简介: ${issues.missingFlavorText.length}`)
  issues.missingFlavorText.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  console.log(`\n形态数据异常: ${issues.emptyForms.length}`)
  issues.emptyForms.slice(0, 20).forEach(n => console.log(`  - ${n}`))

  // 保存完整报告
  const reportPath = path.join(__dirname, '..', 'data', 'review_report.json')
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2), 'utf-8')
  console.log(`\n完整报告已保存到: ${reportPath}`)
}

reviewAll()
