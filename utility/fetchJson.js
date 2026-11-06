import fetch from 'node-fetch';

// Keep the deadline active until the body is consumed, not only until headers.
export async function fetchJson(url, {timeoutMs=15000, fetchImpl=fetch, ...options}={}) {
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try {
  const response=await fetchImpl(url,{...options,signal:controller.signal});
  if(!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
 } finally {clearTimeout(timer);}
}
export const donationMongoOptions={serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:15000};
