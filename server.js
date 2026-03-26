require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// PayPal credentials
const PAYPAL_CLIENT_ID = "";
const PAYPAL_SECRET = "";
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

mongoose.connect("mongodb://127.0.0.1:27017/zaystore")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Get PayPal access token
async function getPayPalAccessToken() {
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  console.log("PayPal token response:", data);

  if (!response.ok || !data.access_token) {
    throw new Error(`PayPal token failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

// Create PayPal order
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { productName, price } = req.body;
    const accessToken = await getPayPalAccessToken();
    const numericPrice = Number(price);

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: productName,
            amount: {
              currency_code: "EUR",
              value: numericPrice.toFixed(2)
            }
          }
        ]
      })
    });

    const order = await response.json();
    console.log("PayPal create-order response:", order);

    if (!response.ok || !order.id) {
      return res.status(500).json({
        error: "Failed to create PayPal order",
        details: order
      });
    }

    res.json(order);
  } catch (error) {
    console.log("Create order error:", error);
    res.status(500).json({
      error: "Failed to create PayPal order",
      details: error.message
    });
  }
});

// Capture PayPal order
app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID, productName, price } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    console.log("PayPal capture response:", data);

    if (data.status === "COMPLETED") {
      const order = new Order({
        productName,
        price,
        status: "Paid",
        paypalOrderId: orderID
      });

      await order.save();
      return res.json({ success: true, data });
    }

    res.status(500).json({ success: false, data });
  } catch (error) {
    console.log("Capture order error:", error);
    res.status(500).json({
      error: "Failed to capture PayPal order",
      details: error.message
    });
  }
});

// Products
app.get("/api/products", async (req, res) => {
  try {
    const search = req.query.search || "";
    const products = await Product.find({
      name: { $regex: search, $options: "i" }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
