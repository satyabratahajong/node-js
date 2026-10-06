const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const csv = require("csv-parser");

const app = express();
const PORT = 3007;
const csvFile = path.join(__dirname, "sales.csv");

function loadSales() {
  return new Promise((resolve, reject) => {
    const sales = [];

    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", (row) => {
        sales.push({
          date: row.date,
          product: row.product,
          category: row.category,
          quantity: Number(row.quantity),
          price: Number(row.price),
          revenue: Number(row.quantity) * Number(row.price)
        });
      })
      .on("end", () => resolve(sales))
      .on("error", reject);
  });
}

app.get("/sales", async (req, res, next) => {
  try {
    const sales = await loadSales();
    res.json(sales);
  } catch (error) {
    next(error);
  }
});

app.get("/sales/summary", async (req, res, next) => {
  try {
    const sales = await loadSales();

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + sale.revenue,
      0
    );

    const totalQuantity = sales.reduce(
      (sum, sale) => sum + sale.quantity,
      0
    );

    const byCategory = {};

    for (const sale of sales) {
      if (!byCategory[sale.category]) {
        byCategory[sale.category] = {
          quantity: 0,
          revenue: 0
        };
      }

      byCategory[sale.category].quantity += sale.quantity;
      byCategory[sale.category].revenue += sale.revenue;
    }

    const byProduct = {};

    for (const sale of sales) {
      if (!byProduct[sale.product]) {
        byProduct[sale.product] = {
          quantity: 0,
          revenue: 0
        };
      }

      byProduct[sale.product].quantity += sale.quantity;
      byProduct[sale.product].revenue += sale.revenue;
    }

    res.json({
      totalOrders: sales.length,
      totalQuantity,
      totalRevenue,
      byCategory,
      byProduct
    });
  } catch (error) {
    next(error);
  }
});

app.get("/sales/top-products", async (req, res, next) => {
  try {
    const sales = await loadSales();
    const productRevenue = {};

    for (const sale of sales) {
      productRevenue[sale.product] =
        (productRevenue[sale.product] || 0) + sale.revenue;
    }

    const products = Object.entries(productRevenue)
      .map(([product, revenue]) => ({
        product,
        revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(products);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Could not process sales data"
  });
});

app.listen(PORT, () => {
  console.log(`Analytics API running at http://localhost:${PORT}`);
});
