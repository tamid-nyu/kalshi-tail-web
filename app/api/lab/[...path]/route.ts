import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const maxDuration=300;
async function proxy(req:NextRequest,context:{params:Promise<{path:string[]}>}){
 const origin=req.headers.get('origin');
 if(origin&&new URL(origin).host!==req.headers.get('host'))return NextResponse.json({detail:'Same-origin requests required'},{status:403});
 const {path}=await context.params;const target=path.join('/');
 const allowed=req.method==='POST'?['uploads','uploads/preview','ingest/trigger','strategies/kalshi-tail/runs'].includes(target):/^uploads\/[a-f0-9]{32}$/.test(target);
 if(!allowed)return NextResponse.json({detail:'Unsupported write operation'},{status:404});
 const token=process.env.LAB_API_TOKEN;
 if(!token)return NextResponse.json({detail:'Server write token is not configured'},{status:503});
 const length=Number(req.headers.get('content-length')||0);
 if(length>4_200_000)return NextResponse.json({detail:'Request must be smaller than 4.2 MB'},{status:413});
 try{
  const body=req.method==='DELETE'?undefined:await req.arrayBuffer();
  if(body&&body.byteLength>4_200_000)return NextResponse.json({detail:'Request must be smaller than 4.2 MB'},{status:413});
  const r=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${target}`,{method:req.method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':req.headers.get('content-type')||'application/json'}:{})},body,cache:'no-store',signal:AbortSignal.timeout(290000)});
  return new NextResponse(await r.text(),{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return NextResponse.json({detail:'The research API could not complete the request. Check the ingest or runs log before retrying.'},{status:502})}
}
export const POST=proxy;export const DELETE=proxy;
