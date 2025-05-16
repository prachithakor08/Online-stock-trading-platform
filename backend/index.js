require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require("cors");

const bcrypt = require("bcryptjs");

const  UserModel  = require('./model/User');
const HoldingsModel  = require('./model/HoldingModel');
const PositionsModel = require('./model/PositionsModel');
const OrdersModel  = require("./model/OrderModel");
const FundModel = require('./model/FundModel');

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGO_URL;
const jwt = require('jsonwebtoken');


const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); // Enable JSON parsing

//  Connect to MongoDB before starting the server
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(" MongoDB Connected");

    // Start server only after successful DB connection
    app.listen(PORT, () => {
        console.log(` Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error(" MongoDB Connection Error:", err);
    process.exit(1); // Exit process if DB connection fails
});


// Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Expecting "Bearer <token>"
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = user; // Attach user info to the request
        next();
    });
};


app.get("/allHoldings", async (req, res) => {
  let allHoldings = await HoldingsModel.find({});
  res.json(allHoldings);
});

app.get("/allPositions", async (req, res) => {
  let allPositions = await PositionsModel.find({});
  res.json(allPositions);
});

app.get("/allOrders", authenticateToken, async (req, res) => {
  try {
    console.log("User ID from token:", req.user.userId);
    const orders = await OrdersModel.find({ userId: req.user.userId });
    console.log("Fetched orders:", orders);
    res.json(orders);
  } catch (error) {
      console.error("Error in /allOrders:", error);
    res.status(500).json({ message: "Error fetching orders: " + error.message });
  }
});


//  Route to add holdings
// app.get('/addHoldings', async (req, res) => {
//     const tempHoldings = [
//         { name: "BHARTIARTL", qty: 2, avg: 538.05, price: 541.15, net: "+0.58%", day: "+2.99%" },
//         { name: "HDFCBANK", qty: 2, avg: 1383.4, price: 1522.35, net: "+10.04%", day: "+0.11%" },
//         { name: "INFY", qty: 1, avg: 1350.5, price: 1555.45, net: "+15.18%", day: "-1.60%", isLoss: true }
//     ];

//     try {
//         await HoldingModel.insertMany(tempHoldings);
//         res.send(" Holdings Inserted Successfully!");
//     } catch (error) {
//         res.status(500).send(" Error inserting holdings: " + error.message);
//     }
// });

// // Route to add positions
// app.get('/addPositions', async (req, res) => {
//     const tempPositions = [
//         { product: "CNC", name: "EVEREADY", qty: 2, avg: 316.27, price: 312.35, net: "+0.58%", day: "-1.24%", isLoss: true },
//         { product: "CNC", name: "JUBLFOOD", qty: 1, avg: 3124.75, price: 3082.65, net: "+10.04%", day: "-1.35%", isLoss: true }
//     ];

//     try {
//         await PositionsModel.insertMany(tempPositions);
//         res.send(" Positions Inserted Successfully!");
//     } catch (error) {
//         res.status(500).send(" Error inserting positions: " + error.message);
//     }
// });


// Route to place a new order
app.post("/newOrder", authenticateToken, async (req, res) => {
  try {
    const newOrder = new OrdersModel({
      name: req.body.name,
      qty: req.body.qty,
      price: req.body.price,
      mode: req.body.mode,
      userId: req.user.userId, // attach user ID
    });

    await newOrder.save();
    res.send("Order saved!");
  } catch (error) {
    res.status(500).send("Error saving order: " + error.message);
  }
});


// // Route to fetch funds
// app.get('/funds', authenticateToken, async (req, res) => {
//     try {
//         const funds = await FundModel.findOne({ userId: req.user.userId });
//         res.json(funds);
//     } catch (error) {
//         res.status(500).send("Error retrieving funds: " + error.message);
//     }
// });



// app.get('/addFunds', async (req, res) => {
//   const tempFund = {
//     availableMargin: 4043.10,
//     usedMargin: 3757.30,
//     availableCash: 4043.10,
//     openingBalance1: 4043.10,
//     openingBalance2: 3736.40,
//     payin: 4064.00,
//     span: 0.00,
//     deliveryMargin: 0.00,
//     exposure: 0.00,
//     optionsPremium: 0.00,
//     collateralLiquid: 0.00,
//     collateralEquity: 0.00,
//     totalCollateral: 0.00,
//   };

//   try {
//     await FundModel.create(tempFund);
//     res.send(" Funds inserted");
//   } catch (error) {
//     res.status(500).send(" Failed to insert funds: " + error.message);
//   }
// });


// Signup Route - Create User and return JWT token
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new UserModel({ username, email, password: hashedPassword });
        await newUser.save();

        // Generate JWT token
        const token = jwt.sign({ userId: newUser._id, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: "Signup successful",
            token, // Send the token in the response
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Login Route - Verify credentials and return JWT token
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/", (req, res) => {
  res.send("Backend is running ");
});
