const assert = require('node:assert/strict');
const User = require('../models/User');
const {hashPassword} = require('../utils/passwords');

process.env.JWT_SECRET = 'test_secret_for_profile_tests_12345';

const sharp = require('sharp');
const {updateProfile,saveProfilePicture} = require('../controllers/profileController');

function invoke(body, authVersion, role = 'admin') {
  const req = {
    body,
    user: {_id:'64b000000000000000000001',role,authVersion},
  };
  const res = {
    statusCode:200,
    status(code) { this.statusCode = code; return this; },
  };
  return new Promise(resolve => {
    res.json = payload => {
      res.payload = payload;
      resolve({req,res});
    };
    updateProfile(req,res,error => resolve({req,res,error}));
  });
}

async function run() {
  const originalFindById = User.findById;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const priorSecret = process.env.JWT_SECRET;
  let storedUser = {
    _id:'64b000000000000000000001',
    role:'admin',
    email:'admin@example.com',
    authVersion:4,
    password:await hashPassword('CurrentPassword123!'),
  };
  let updateCall;

  try {
    User.findById = () => ({select:async () => ({...storedUser})});
    User.findOneAndUpdate = (filter, update) => ({select:async () => {
      updateCall = {filter,update};
      storedUser = {...storedUser,...update.$set,authVersion:storedUser.authVersion + update.$inc.authVersion};
      return {...storedUser};
    }});
    User.findByIdAndUpdate = async () => null;

    let result = await invoke({email:'new.admin@gmail.com'},4);
    assert.equal(result.res.statusCode,400);
    assert.match(result.error.message,/current password/i);
    assert.equal(updateCall,undefined);

    result = await invoke({email:'new.admin@gmail.com',currentPassword:'WrongPassword123!'},4);
    assert.equal(result.res.statusCode,400);
    assert.equal(updateCall,undefined);

    result = await invoke({email:'  NEW.Admin@Gmail.com ',currentPassword:'CurrentPassword123!'},4);
    assert.ifError(result.error);
    assert.equal(result.res.statusCode,200);
    assert.equal(updateCall.filter.authVersion,4);
    assert.equal(updateCall.update.$set.email,'new.admin@gmail.com');
    assert.equal(updateCall.update.$inc.authVersion,1);
    assert.equal(storedUser.authVersion,5);
    assert.equal(result.res.payload.data.user.email,'new.admin@gmail.com');
    assert.equal(typeof result.res.payload.token,'string');

    result = await invoke({email:'another.admin@gmail.com',currentPassword:'CurrentPassword123!'},4);
    assert.equal(result.res.statusCode,409);
    assert.match(result.error.message,/account changed/i);

    const imageBuffer = await sharp({create:{width:8,height:8,channels:3,background:'#16834d'}}).png().toBuffer();
    User.findByIdAndUpdate = (_id,update) => ({select:async () => ({...storedUser,profilePicture:update.$set.profilePicture})});
    const pictureReq = {
      user:{_id:storedUser._id,role:'admin'},
      file:{buffer:imageBuffer,mimetype:'image/png',size:imageBuffer.length},
    };
    const pictureRes = {
      statusCode:200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; },
    };
    let pictureError;
    await saveProfilePicture(pictureReq,pictureRes,error => { pictureError=error; });
    assert.ifError(pictureError);
    assert.equal(pictureReq.securityEvent,'admin_profile_picture_change');
    assert.match(pictureRes.payload.picture,/^data:image\/webp;base64,/);
    const storedImage = Buffer.from(pictureRes.payload.picture.split(',')[1],'base64');
    assert.equal((await sharp(storedImage).metadata()).format,'webp');

    const deniedReq = {...pictureReq,user:{_id:storedUser._id,role:'teacher'}};
    const deniedRes = {statusCode:200,status(code) { this.statusCode=code;return this; }};
    let deniedError;
    await saveProfilePicture(deniedReq,deniedRes,error => { deniedError=error; });
    assert.equal(deniedRes.statusCode,403);
    assert.match(deniedError.message,/administrators/i);

    console.log('Admin profile picture and email-change security checks passed.');
  } finally {
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    if (priorSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorSecret;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
