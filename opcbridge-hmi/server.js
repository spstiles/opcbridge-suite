const { createApp } = require("./server/app");

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`OPCBridge HMI server running on http://localhost:${PORT}`);
});

void app.locals.trendCache.start().catch(error=>console.error('Trend cache startup:',error.message));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
  server.close();
  void app.locals.trendCache.stop().finally(()=>process.exit(0));
});
