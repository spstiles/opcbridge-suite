'use strict';
const express = require('express');
function queryParameters(query, now = Date.now()) {
  const connection = String(query.connection_id || '').trim();
  const tag = String(query.tag_name || '').trim();
  const from = Number(query.from_ms), to = Number(query.to_ms);
  if (!connection || !tag || connection.length > 512 || tag.length > 4096) throw new Error('A connection and tag are required.');
  if (![from,to].every(Number.isSafeInteger) || from < 0 || to <= from || to-from > 31*86400000 || to > now+60000) throw new Error('Trend range must be between one millisecond and 31 days, ending no later than now.');
  const seconds = Math.max(1, Math.ceil((to-from)/1200/1000));
  return new URLSearchParams({connection_id:connection,tag_name:tag,from_ms:String(from),to_ms:String(to),bucket:`${seconds}s`,limit:'1500'});
}
function createTrendsRouter({readConfig, cache, request = fetch}) {
  const router = express.Router();
  router.get('/status', (_req,res)=>res.json({ok:true,...(cache?.status||{}),retention:'rolling'}));
  router.get('/query', async(req,res)=>{
    let params;
    try { params=queryParameters(req.query); } catch(error) { return res.status(400).json({ok:false,error:error.message}); }
    const source=String(req.query.source||'cache');
    if(!['cache','historian'].includes(source))return res.status(400).json({ok:false,error:'Unknown trend source.'});
    if(source==='cache'){
      res.setHeader('Cache-Control','no-store');
      return res.json(cache?cache.query(params.get('connection_id'),params.get('tag_name'),Number(params.get('from_ms')),Number(params.get('to_ms'))):{ok:true,source:'cache',collecting:false,buckets:[]});
    }
    try {
      const {config} = await readConfig();
      const history = config.historian || {};
      const host = String(history.host || '127.0.0.1');
      const port = Number(history.httpPort) || 8096;
      const response = await request(`http://${host}:${port}/query?${params}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      const body = await response.json();
      res.setHeader('Cache-Control','no-store');
      if(!response.ok || body.ok===false) return res.status(502).json({ok:false,error:body.error || 'Historian query failed.'});
      res.json(body);
    } catch(error) { res.status(502).json({ok:false,error:`Historian unavailable: ${error.message}`}); }
  });
  return router;
}
module.exports={queryParameters,createTrendsRouter};
