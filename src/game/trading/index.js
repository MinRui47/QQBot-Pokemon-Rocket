const { ITEM_CONFIG, getPokemonRarity, RARITY_COLORS } = require('../models')

let TEAM_ROCKET_FUNDS = 0

class Listing {
  constructor(id, sellerId, sellerName, itemType, itemName, quantity, price, expiresAt) {
    this.id = id
    this.sellerId = sellerId
    this.sellerName = sellerName
    this.itemType = itemType
    this.itemName = itemName
    this.quantity = quantity
    this.price = price
    this.expiresAt = expiresAt
    this.status = 'active'
  }
  
  isExpired() {
    return Date.now() > this.expiresAt
  }
  
  toJSON() {
    return {
      id: this.id,
      sellerId: this.sellerId,
      sellerName: this.sellerName,
      itemType: this.itemType,
      itemName: this.itemName,
      quantity: this.quantity,
      price: this.price,
      expiresAt: this.expiresAt,
      status: this.status
    }
  }
  
  static fromJSON(data) {
    const listing = new Listing(
      data.id, data.sellerId, data.sellerName,
      data.itemType, data.itemName, data.quantity,
      data.price, data.expiresAt
    )
    listing.status = data.status
    return listing
  }
}

class TradingSystem {
  constructor() {
    this.playerListings = []
    this.auctionListings = []
    this.nextListingId = 1
    this.listingTimeout = 300000
  }
  
  getTeamRocketFunds() {
    return TEAM_ROCKET_FUNDS
  }
  
  addToTeamRocketFunds(amount) {
    TEAM_ROCKET_FUNDS += amount
  }
  
  sellDirect(player, itemName, quantity) {
    const warehouse = player.warehouse
    const item = warehouse.items.find(i => i.name === itemName)
    
    if (!item || item.quantity < quantity) {
      return { success: false, message: `\u4E0D\u8DB3\u7684 ${itemName}（仓库：${item?.quantity || 0}）` }
    }
    
    const config = ITEM_CONFIG[itemName] || { basePrice: 10 }
    const totalPrice = config.basePrice * quantity
    
    warehouse.removeItem(itemName, quantity)
    player.addMoney(totalPrice)
    
    return { success: true, message: `\u76F4\u53D1\u56DE\u6536 ${itemName} x${quantity}，获得 ${totalPrice} 金币` }
  }
  
  listItem(player, itemType, itemName, quantity, price) {
    if (itemType === 'player') {
      if (this.playerListings.filter(l => l.sellerId === player.userId && l.status === 'active').length >= 4) {
        return { success: false, message: '最多同时挂4件物品' }
      }
    } else {
      if (this.auctionListings.filter(l => l.sellerId === player.userId && l.status === 'active').length >= 10) {
        return { success: false, message: '拍卖行最多同时挂10件物品' }
      }
    }
    
    const warehouse = player.warehouse
    
    if (itemType === 'pokemon') {
      const pokemonIndex = warehouse.pokemon.findIndex(p => p.name === itemName)
      if (pokemonIndex === -1) {
        return { success: false, message: `仓库中没有 ${itemName}` }
      }
    } else {
      const item = warehouse.items.find(i => i.name === itemName)
      if (!item || item.quantity < quantity) {
        return { success: false, message: `\u4E0D\u8DB3\u7684 ${itemName}（仓库：${item?.quantity || 0}）` }
      }
    }
    
    const basePrice = this._getBasePrice(itemType, itemName)
    if (price < basePrice) {
      return { success: false, message: `\u4EF7\u683C\u4E0D\u80FD\u4F4E\u4E8E\u57FA\u4EF7（${basePrice}）` }
    }
    
    const listing = new Listing(
      this.nextListingId++,
      player.userId,
      player.username,
      itemType === 'pokemon' ? 'pokemon' : 'item',
      itemName,
      quantity,
      price,
      Date.now() + this.listingTimeout
    )
    
    if (itemType === 'player') {
      this.playerListings.push(listing)
    } else {
      this.auctionListings.push(listing)
    }
    
    if (itemType !== 'pokemon') {
      warehouse.removeItem(itemName, quantity)
    }
    
    return { success: true, message: `\u4E0A\u67B6\u6210\u529F！ID: ${listing.id}，${itemName} x${quantity}，售价 ${price} 金币`, listing }
  }
  
  buyItem(buyer, listingId) {
    let listing = this.playerListings.find(l => l.id === listingId && l.status === 'active')
    const isAuction = !listing
    
    if (isAuction) {
      listing = this.auctionListings.find(l => l.id === listingId && l.status === 'active')
    }
    
    if (!listing) {
      return { success: false, message: '未找到该商品' }
    }
    
    if (listing.sellerId === buyer.userId) {
      return { success: false, message: '不能购买自己的商品' }
    }
    
    if (buyer.money < listing.price) {
      return { success: false, message: '金币不足' }
    }
    
    buyer.spendMoney(listing.price)
    
    const feeRate = isAuction ? 0.05 : 0.03
    const fee = Math.floor(listing.price * feeRate)
    const sellerAmount = listing.price - fee
    
    this.addToTeamRocketFunds(fee)
    
    return { success: true, message: `\u8D2D\u4E70\u6210\u529F！${listing.itemName} x${listing.quantity}，花费 ${listing.price} 金币（手续费 ${fee}）`, listing }
  }
  
  cancelListing(player, listingId) {
    let listing = this.playerListings.find(l => l.id === listingId && l.status === 'active')
    let listings = this.playerListings
    
    if (!listing) {
      listing = this.auctionListings.find(l => l.id === listingId && l.status === 'active')
      listings = this.auctionListings
    }
    
    if (!listing) {
      return { success: false, message: '未找到该商品' }
    }
    
    if (listing.sellerId !== player.userId) {
      return { success: false, message: '无权取消他人商品' }
    }
    
    listing.status = 'cancelled'
    
    if (listing.itemType !== 'pokemon') {
      player.warehouse.addItem(listing.itemName, listing.quantity)
    }
    
    return { success: true, message: `\u53D6\u6D88\u4E0A\u67B6：${listing.itemName} x${listing.quantity}` }
  }
  
  getPlayerListings() {
    return this.playerListings.filter(l => l.status === 'active' && !l.isExpired())
  }
  
  getAuctionListings() {
    return this.auctionListings.filter(l => l.status === 'active' && !l.isExpired())
  }
  
  processExpiredListings() {
    const expiredPlayer = this.playerListings.filter(l => l.isExpired() && l.status === 'active')
    const expiredAuction = this.auctionListings.filter(l => l.isExpired() && l.status === 'active')
    
    for (const listing of expiredPlayer) {
      listing.status = 'expired'
    }
    
    for (const listing of expiredAuction) {
      listing.status = 'expired'
    }
  }
  
  _getBasePrice(itemType, itemName) {
    if (itemType === 'pokemon') {
      const rarity = getPokemonRarity(itemName)
      const rarityMultiplier = { white: 1, green: 2, blue: 4, purple: 8, gold: 20 }
      return rarityMultiplier[rarity] * 50
    }
    
    return ITEM_CONFIG[itemName]?.basePrice || 10
  }
  
  toJSON() {
    return {
      playerListings: this.playerListings.map(l => l.toJSON()),
      auctionListings: this.auctionListings.map(l => l.toJSON()),
      nextListingId: this.nextListingId,
      teamRocketFunds: TEAM_ROCKET_FUNDS
    }
  }
  
  static fromJSON(data) {
    const ts = new TradingSystem()
    ts.playerListings = data.playerListings.map(l => Listing.fromJSON(l))
    ts.auctionListings = data.auctionListings.map(l => Listing.fromJSON(l))
    ts.nextListingId = data.nextListingId
    TEAM_ROCKET_FUNDS = data.teamRocketFunds || 0
    return ts
  }
}

module.exports = {
  TradingSystem,
  Listing,
  getTeamRocketFunds: () => TEAM_ROCKET_FUNDS,
  addToTeamRocketFunds: (amount) => { TEAM_ROCKET_FUNDS += amount }
}