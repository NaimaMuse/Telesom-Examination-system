// Used by enableEvaluationTransactions.ps1 after restarting the local MongoDB service.
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const {MongoClient}=require('mongoose').mongo;
(async()=>{
 const client=await MongoClient.connect(process.env.MONGODB_URI,{directConnection:true,serverSelectionTimeoutMS:10000});
 try{
  const admin=client.db('admin');let hello=await admin.command({hello:1});
  if(hello.setName&&hello.setName!=='rs0')throw new Error('Existing replica set has a different name. No changes made.');
  if(!hello.setName)await admin.command({replSetInitiate:{_id:'rs0',members:[{_id:0,host:'localhost:27017'}]}});
  for(let i=0;i<60;i++){hello=await admin.command({hello:1});if(hello.isWritablePrimary&&hello.setName==='rs0'){console.log('Local MongoDB replica set rs0 is ready. Existing databases are preserved.');return;}await new Promise(r=>setTimeout(r,500));}
  throw new Error('Replica set election did not complete. Check MongoDB service logs.');
 }finally{await client.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
