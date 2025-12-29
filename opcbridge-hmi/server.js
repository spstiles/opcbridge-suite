const { createApp } = require("./server/app");

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`opcbridge-HMI server running on http://localhost:${PORT}`);
});
