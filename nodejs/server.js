const express = require("express");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Node.js backend is running!");
});

app.listen(PORT, () => {
  console.log(`Node.js backend running on http://localhost:${PORT}`);
});
