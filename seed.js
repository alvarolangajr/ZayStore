const mongoose = require("mongoose");
const Product = require("./models/Product");

mongoose.connect("mongodb://127.0.0.1:27017/zaystore")
  .then(async () => {
    console.log("MongoDB connected for seed");

    await Product.deleteMany({});

    await Product.insertMany([
      {
        name: "Nike Mercurial Superfly 10 Elite",
        price: 250,
        description: "For those who want Speed.",
        image: "images/Mercurial.avif",
        category: "Football Boots"
      },
      {
        name: "Adidas Predator Elite",
        price: 270,
        description: "Precision easy for those who wear it.",
        image: "images/Predator.avif",
        category: "Football Boots"
      },
      {
        name: "Puma Future 9 Ultimate",
        price: 240,
        description: "Unleash your playmaking.",
        image: "images/Future.avif",
        category: "Football Boots"
      },
      {
        name: "Under Armour Elite 3",
        price: 230,
        description: "Separation is a weapon for those who want it.",
        image: "images/Under.avif",
        category: "Football Boots"
      },
      {
        name: "Adidas Copa Pure IV",
        price: 240,
        description: "Reliability and Comfort is easy.",
        image: "images/Copa.avif",
        category: "Football Boots"
      }
    ]);

    console.log("Products inserted");
    process.exit();
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });