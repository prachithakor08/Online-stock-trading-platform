const mongoose = require('mongoose');

const FundSchema = new mongoose.Schema({
  availableMargin: Number,
  usedMargin: Number,
  availableCash: Number,
  openingBalance1: Number,
  openingBalance2: Number,
  payin: Number,
  span: Number,
  deliveryMargin: Number,
  exposure: Number,
  optionsPremium: Number,
  collateralLiquid: Number,
  collateralEquity: Number,
  totalCollateral: Number,
});

module.exports = mongoose.model('Fund', FundSchema);
