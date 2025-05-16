const mongoose = require("mongoose");
const { OrdersSchema } = require("../schemas/OrderSchema");

const OrdersModel = mongoose.model("Order", OrdersSchema);

module.exports = OrdersModel;
